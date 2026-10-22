// Server-only cores shared by user-triggered server functions and the scheduled scan.
// Every query filters by user_id explicitly so these are safe with both the RLS client and the admin client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { fetchBoard, pool } from "./ats";
import { matchResume } from "./match";
import { applyScoringRules, estimatedScore } from "./rules";
import { callLlm } from "./llm.server";

type Db = SupabaseClient<Database>;
const MAX_PER_COMPANY = 80;

export type ScanResult = { company: string; found: number; added: number; error?: string };

export async function activeResume(db: Db, userId: string) {
  const { data } = await db.from("resumes").select("id,content").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data;
}

export async function scanForUser(db: Db, userId: string): Promise<ScanResult[]> {
  const { data: companies, error } = await db.from("watched_companies").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const resumeText = (await activeResume(db, userId))?.content ?? "";
  const now = new Date().toISOString();

  return pool(companies ?? [], 4, async (c): Promise<ScanResult> => {
    try {
      const postings = (await fetchBoard(c.ats, c.slug)).slice(0, MAX_PER_COMPANY);
      const { data: existing } = await db.from("jobs").select("external_id").eq("user_id", userId).eq("ats", c.ats).eq("company", c.name);
      const known = new Set((existing ?? []).map((e) => e.external_id));
      const rows = postings.map((p) => {
        const m = resumeText ? matchResume(resumeText, `${p.title}\n${p.description}`) : null;
        return {
          user_id: userId, company: c.name, ats: c.ats, external_id: p.external_id, title: p.title, location: p.location, url: p.url,
          description: p.description.slice(0, 8000), status: "open", last_seen_at: now, // reopens a returning posting
          match_score: m?.score ?? null, matched_keywords: m?.matched ?? [], missing_keywords: m?.missing ?? [],
        };
      });
      if (rows.length) {
        const { error: upErr } = await db.from("jobs").upsert(rows, { onConflict: "user_id,ats,external_id" });
        if (upErr) throw new Error(upErr.message);
      }
      const seen = postings.map((p) => p.external_id);
      let q = db.from("jobs").update({ status: "closed" }).eq("user_id", userId).eq("company", c.name).eq("ats", c.ats).eq("status", "open");
      if (seen.length) q = q.not("external_id", "in", `(${seen.map((x) => `"${x.replace(/"/g, "")}"`).join(",")})`);
      await q;
      await db.from("watched_companies").update({ last_scanned_at: now }).eq("id", c.id).eq("user_id", userId);
      return { company: c.name, found: postings.length, added: postings.filter((p) => !known.has(p.external_id)).length };
    } catch (e) {
      return { company: c.name, found: 0, added: 0, error: e instanceof Error ? e.message : "Scan failed" };
    }
  });
}

const BatchSchema = z.object({
  scores: z.array(z.object({ id: z.string(), score: z.number().min(0).max(10), reason: z.string(), skills_fit: z.enum(["strong", "partial", "weak"]), domain_fit: z.enum(["strong", "partial", "weak"]) })),
});

export type ScoreSummary = { scored: number; estimated: boolean; message?: string | undefined; alerts: number };

/** Score open jobs not yet in job_scores against the active resume (JobRadar style), batching 6 jobs per AI call. */
export async function scoreJobsForUser(db: Db, userId: string, limit = 30): Promise<ScoreSummary> {
  const resume = await activeResume(db, userId);
  if (!resume?.content) return { scored: 0, estimated: false, message: "Save a resume first to score jobs.", alerts: 0 };
  const { data: profile } = await db.from("profiles").select("seniority").eq("user_id", userId).maybeSingle();
  const { data: done } = await db.from("job_scores").select("job_id").eq("user_id", userId).eq("resume_id", resume.id);
  const doneIds = new Set((done ?? []).map((d) => d.job_id));
  const { data: jobs } = await db.from("jobs").select("id,title,company,description,match_score").eq("user_id", userId).eq("status", "open").order("match_score", { ascending: false, nullsFirst: false }).limit(300);
  const todo = (jobs ?? []).filter((j) => !doneIds.has(j.id)).slice(0, limit);
  let estimated = false, message: string | undefined, alerts = 0;
  const resumeSnippet = resume.content.slice(0, 6000);

  for (let i = 0; i < todo.length; i += 6) {
    const batch = todo.slice(i, i + 6);
    const res = estimated ? null : await callLlm(db, userId, {
      system: "You are a strict recruiter. Score how well the candidate fits each job from 0 to 10. Be honest; most roles are 3-6. Give a one-sentence reason. Rate skills_fit and domain_fit as strong, partial or weak. Output {\"scores\":[{\"id\",\"score\",\"reason\",\"skills_fit\",\"domain_fit\"}]}.",
      user: `RESUME:\n${resumeSnippet}\n\nJOBS:\n${batch.map((j) => `id=${j.id}\n${j.title} at ${j.company}\n${(j.description ?? "").slice(0, 1500)}`).join("\n---\n")}`,
      schema: BatchSchema,
    });
    if (res && !res.ok) { estimated = true; message = res.message; }
    const rows = batch.map((j) => {
      const ai = res?.ok ? res.data.scores.find((s) => s.id === j.id) : undefined;
      const out = ai ? applyScoringRules({ score: ai.score, title: j.title, seniority: profile?.seniority ?? null, skillsFit: ai.skills_fit, domainFit: ai.domain_fit }) : estimatedScore(j.match_score, j.title, profile?.seniority ?? null);
      return { user_id: userId, job_id: j.id, resume_id: resume.id, llm_score: out.score, rule_applied: out.rule, reason: ai?.reason ?? `Estimated from keyword match (${j.match_score ?? 0}%).`, model: ai && res?.ok ? res.model : "estimated", _title: j.title, _company: j.company };
    });
    const { error } = await db.from("job_scores").upsert(rows.map(({ _title, _company, ...r }) => r), { onConflict: "job_id,resume_id" });
    if (error) throw new Error(error.message);
    const hits = rows.filter((r) => r.llm_score >= 7);
    if (hits.length) {
      await db.from("alerts").insert(hits.map((h) => ({ user_id: userId, kind: "new_match", title: `${h.llm_score}/10 · ${h._title} at ${h._company}`, body: h.reason, job_id: h.job_id })));
      alerts += hits.length;
    }
  }
  return { scored: todo.length, estimated, message, alerts };
}
