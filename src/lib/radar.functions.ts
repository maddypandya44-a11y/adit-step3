import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { matchResume } from "./match";

type Posting = { external_id: string; title: string; location: string | null; url: string | null; description: string };
const MAX_PER_COMPANY = 80;

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Board returned ${res.status}`);
  return res.json();
}

function decode(html: string) {
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchBoard(ats: string, slug: string): Promise<Posting[]> {
  const s = encodeURIComponent(slug);
  if (ats === "greenhouse") {
    const d = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`);
    return (d.jobs ?? []).map((j: any) => ({ external_id: String(j.id), title: j.title, location: j.location?.name ?? null, url: j.absolute_url ?? null, description: decode(j.content ?? "") }));
  }
  if (ats === "lever") {
    const d = await fetchJson(`https://api.lever.co/v0/postings/${s}?mode=json`);
    return (d ?? []).map((j: any) => ({ external_id: String(j.id), title: j.text, location: j.categories?.location ?? null, url: j.hostedUrl ?? null, description: j.descriptionPlain ?? "" }));
  }
  const d = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${s}`);
  return (d.jobs ?? []).map((j: any) => ({ external_id: String(j.id), title: j.title, location: j.location ?? null, url: j.jobUrl ?? null, description: j.descriptionPlain ?? "" }));
}

export const scanRadar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: companies, error } = await supabase.from("watched_companies").select("*");
    if (error) throw new Error(error.message);
    const { data: resume } = await supabase.from("resumes").select("content").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const resumeText = resume?.content ?? "";
    const results: { company: string; found: number; added: number; error?: string }[] = [];
    const now = new Date().toISOString();

    for (const c of companies ?? []) {
      try {
        const postings = (await fetchBoard(c.ats, c.slug)).slice(0, MAX_PER_COMPANY);
        const { data: existing } = await supabase.from("jobs").select("external_id").eq("ats", c.ats).eq("company", c.name);
        const known = new Set((existing ?? []).map((e) => e.external_id));
        const rows = postings.map((p) => {
          const m = resumeText ? matchResume(resumeText, `${p.title} ${p.description}`) : null;
          return {
            user_id: userId, company: c.name, ats: c.ats, external_id: p.external_id, title: p.title, location: p.location, url: p.url,
            description: p.description.slice(0, 8000), status: "open", last_seen_at: now,
            match_score: m?.score ?? null, matched_keywords: m?.matched ?? [], missing_keywords: m?.missing ?? [],
          };
        });
        if (rows.length) {
          const { error: upErr } = await supabase.from("jobs").upsert(rows, { onConflict: "user_id,ats,external_id" });
          if (upErr) throw new Error(upErr.message);
        }
        // Postings no longer on the board are marked closed
        const seen = postings.map((p) => p.external_id);
        if (seen.length) {
          await supabase.from("jobs").update({ status: "closed" }).eq("company", c.name).eq("ats", c.ats).eq("status", "open").not("external_id", "in", `(${seen.map((x) => `"${x}"`).join(",")})`);
        }
        await supabase.from("watched_companies").update({ last_scanned_at: now }).eq("id", c.id);
        results.push({ company: c.name, found: postings.length, added: postings.filter((p) => !known.has(p.external_id)).length });
      } catch (e) {
        results.push({ company: c.name, found: 0, added: 0, error: e instanceof Error ? e.message : "Scan failed" });
      }
    }
    return results;
  });
