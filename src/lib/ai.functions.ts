import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { matchResume } from "./match";
import { followUpDates } from "./rules";

const NO_INVENT = "Use ONLY facts present in the resume. Never invent employers, dates, numbers, degrees or tools. If a metric is unknown, use a placeholder like [X%] for the user to fill in.";

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ resume: z.string().min(20).max(50000), job: z.string().min(20).max(30000), resumeId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { callLlm } = await import("./llm.server");
    const local = matchResume(data.resume, data.job);
    const res = await callLlm(context.supabase, context.userId, {
      system: "Compare a resume with a job description like an ATS plus an expert recruiter. Output {\"score\":0-100,\"matched\":[keywords],\"missing\":[keywords],\"suggestions\":[concrete rewrite suggestions, max 6],\"profile\":{\"skills\":[],\"years\":number|null,\"titles\":[]}}.",
      user: `RESUME:\n${data.resume.slice(0, 12000)}\n\nJOB:\n${data.job.slice(0, 8000)}`,
      schema: z.object({ score: z.number().min(0).max(100), matched: z.array(z.string()), missing: z.array(z.string()), suggestions: z.array(z.string()), profile: z.object({ skills: z.array(z.string()), years: z.number().nullable(), titles: z.array(z.string()) }).optional() }),
    });
    if (!res.ok) return { source: "local" as const, message: res.message, ...local };
    if (data.resumeId && res.data.profile) await context.supabase.from("resumes").update({ parsed: res.data.profile }).eq("id", data.resumeId);
    return { source: "ai" as const, message: undefined, score: Math.round(res.data.score), matched: res.data.matched, missing: res.data.missing, suggestions: res.data.suggestions, required: local.required, niceToHave: local.niceToHave };
  });

export const improveResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ resume: z.string().min(20).max(50000), job: z.string().max(30000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { callLlm } = await import("./llm.server");
    const res = await callLlm(context.supabase, context.userId, {
      system: `Rewrite weak resume bullets into achievement bullets (action verb + what + measurable result + tool). ${NO_INVENT} Output {"changes":[{"before":"exact original line","after":"rewritten line"}]} with at most 12 changes.`,
      user: `RESUME:\n${data.resume.slice(0, 12000)}${data.job ? `\n\nTARGET JOB:\n${data.job.slice(0, 6000)}` : ""}`,
      schema: z.object({ changes: z.array(z.object({ before: z.string(), after: z.string() })) }),
    });
    if (!res.ok) return { ok: false as const, message: res.message };
    const changes = res.data.changes.filter((c) => c.before.trim() && data.resume.includes(c.before.trim()));
    let improved = data.resume;
    for (const c of changes) improved = improved.replace(c.before.trim(), c.after.trim());
    return { ok: true as const, changes, improved };
  });

export const tailorForJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: db, userId } = context;
    const { callLlm } = await import("./llm.server");
    const { activeResume } = await import("./core.server");
    const resume = await activeResume(db, userId);
    if (!resume?.content) return { ok: false as const, message: "Save a resume first." };
    const { data: job } = await db.from("jobs").select("*").eq("id", data.jobId).single();
    if (!job) return { ok: false as const, message: "Job not found." };
    const res = await callLlm(db, userId, {
      system: `Tailor the resume to this job: reorder and rephrase to emphasise relevant experience, mirror the job's keywords where truthful. ${NO_INVENT} Also write a concise cover letter (max 250 words). Pre-fill answers to common application questions; leave work authorisation and salary empty strings. Output {"resume":"full tailored resume text","cover_letter":"...","answers":{"why_company":"","why_role":"","work_authorisation":"","salary_expectation":"","notice_period":""}}.`,
      user: `RESUME:\n${resume.content.slice(0, 12000)}\n\nJOB: ${job.title} at ${job.company}\n${(job.description ?? "").slice(0, 7000)}`,
      schema: z.object({ resume: z.string().min(50), cover_letter: z.string(), answers: z.record(z.string()) }),
    });
    if (!res.ok) return { ok: false as const, message: res.message };
    const answers = { ...res.data.answers, work_authorisation: "" };
    const { data: version, error: vErr } = await db.from("resume_versions").insert({ user_id: userId, resume_id: resume.id, job_id: job.id, label: `Tailored · ${job.company} ${job.title}`.slice(0, 120), content: res.data.resume, kind: "tailored" }).select("id").single();
    if (vErr) throw new Error(vErr.message);
    let { data: app } = await db.from("applications").select("id").eq("job_id", job.id).maybeSingle();
    if (!app) app = (await db.from("applications").insert({ user_id: userId, job_id: job.id, company: job.company, title: job.title, url: job.url, status: "saved" }).select("id").single()).data;
    const { data: pkg, error } = await db.from("application_packages").insert({ user_id: userId, application_id: app?.id ?? null, job_id: job.id, resume_version_id: version.id, cover_letter: res.data.cover_letter, answers, status: "draft" }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true as const, packageId: pkg.id };
  });

/** Creates +5 / +10 day follow-up drafts (email + LinkedIn) when an application moves to Applied. Idempotent. */
export const createFollowUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ applicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase: db, userId } = context;
    const { count } = await db.from("follow_ups").select("id", { count: "exact", head: true }).eq("application_id", data.applicationId);
    if (count) return { created: 0 };
    const { data: app } = await db.from("applications").select("*").eq("id", data.applicationId).single();
    if (!app) return { created: 0 };
    const applied = new Date(app.applied_at ?? Date.now());
    const [d5, d10] = followUpDates(applied) as [Date, Date];
    const { callLlm } = await import("./llm.server");
    const res = await callLlm(db, userId, {
      system: "Write short, polite, specific job-application follow-ups. No flattery, no invented facts. Output {\"email1\":{\"subject\",\"body\"},\"email2\":{\"subject\",\"body\"},\"linkedin\":\"max 280 chars\"}.",
      user: `Role: ${app.title} at ${app.company}. Applied ${applied.toDateString()}. Notes: ${app.notes.slice(0, 500)}`,
      schema: z.object({ email1: z.object({ subject: z.string(), body: z.string() }), email2: z.object({ subject: z.string(), body: z.string() }), linkedin: z.string() }),
    });
    const t = res.ok ? res.data : {
      email1: { subject: `Following up: ${app.title} application`, body: `Hi,\n\nI applied for the ${app.title} role at ${app.company} last week and wanted to say I'm still very interested. Happy to share anything else that helps.\n\nThanks,` },
      email2: { subject: `Checking in on ${app.title}`, body: `Hi,\n\nJust checking in on my application for ${app.title}. I'd love to hear about next steps whenever convenient.\n\nBest,` },
      linkedin: `Hi! I recently applied for the ${app.title} role at ${app.company} and would love to connect.`,
    };
    const rows = [
      { user_id: userId, application_id: app.id, channel: "email", subject: t.email1.subject, body: t.email1.body, due_at: d5.toISOString() },
      { user_id: userId, application_id: app.id, channel: "linkedin", subject: "LinkedIn message", body: t.linkedin, due_at: d5.toISOString() },
      { user_id: userId, application_id: app.id, channel: "email", subject: t.email2.subject, body: t.email2.body, due_at: d10.toISOString() },
    ];
    const { error } = await db.from("follow_ups").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });

export const saveLlmKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string().max(400).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { encrypt } = await import("./crypto.server");
    const enc = data.key ? await encrypt(data.key.trim()) : null;
    const { error } = await context.supabase.from("profiles").upsert({ user_id: context.userId, llm_api_key_encrypted: enc }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { saved: !!enc };
  });
