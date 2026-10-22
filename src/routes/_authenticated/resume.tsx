import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { matchResume } from "@/lib/match";
import { pdfToText } from "@/lib/pdf";
import { useServerFn } from "@tanstack/react-start";
import { analyzeResume, improveResume } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({ meta: [{ title: "Resume match — Workly" }] }),
  component: ResumePage,
});

function ResumePage() {
  const qc = useQueryClient();
  const { data: resume } = useQuery({
    queryKey: ["active-resume"],
    queryFn: async () => (await supabase.from("resumes").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  const [text, setText] = useState("");
  const [job, setJob] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (resume) setText(resume.content); }, [resume]);
  const local = useMemo(() => (text && job ? matchResume(text, job) : null), [text, job]);
  const analyze = useServerFn(analyzeResume);
  const improve = useServerFn(improveResume);
  const [ai, setAi] = useState<null | { score: number; matched: string[]; missing: string[]; suggestions: string[]; source: string }>(null);
  const [aiBusy, setAiBusy] = useState<"" | "analyze" | "improve">("");
  const [diff, setDiff] = useState<null | { changes: { before: string; after: string }[]; improved: string }>(null);
  useEffect(() => setAi(null), [text, job]);
  const result = ai ?? local;
  const { data: versions } = useQuery({
    queryKey: ["versions", resume?.id],
    enabled: !!resume?.id,
    queryFn: async () => (await supabase.from("resume_versions").select("id,label,kind,content,created_at").eq("resume_id", resume!.id).order("created_at", { ascending: false }).limit(30)).data ?? [],
  });

  async function runAnalyze() {
    if (text.length < 20 || job.length < 20) { toast.error("Add both your resume and a job description"); return; }
    setAiBusy("analyze");
    try { const r = await analyze({ data: { resume: text, job, resumeId: resume?.id } }); setAi(r); if (r.message) toast.message(r.message); }
    catch { toast.error("Analysis failed — try again later"); }
    setAiBusy("");
  }
  async function runImprove() {
    if (text.length < 20) { toast.error("Add your resume first"); return; }
    setAiBusy("improve");
    try { const r = await improve({ data: { resume: text, job: job || undefined } }); if (!r.ok) toast.message(r.message); else if (!r.changes.length) toast.message("No weak bullets found"); else setDiff(r); }
    catch { toast.error("Couldn't improve right now — try again later"); }
    setAiBusy("");
  }
  async function saveVersion(content: string, kind: "original" | "improved", label: string) {
    if (!resume?.id) { toast.error("Save your resume first"); return; }
    const { error } = await supabase.from("resume_versions").insert({ resume_id: resume.id, content, kind, label });
    if (error) { toast.error(error.message); return; }
    toast.success("Version saved");
    qc.invalidateQueries({ queryKey: ["versions"] });
  }
  async function applyDiff() {
    if (!diff) return;
    await saveVersion(text, "original", "Before AI improvements");
    await saveVersion(diff.improved, "improved", `Improved ${new Date().toLocaleDateString()}`);
    setText(diff.improved); setDiff(null);
    toast.success("Applied. Click “Save resume” to make it your active resume.");
  }

  async function onFile(f: File) {
    setBusy(true);
    try {
      const t = f.type === "application/pdf" || f.name.endsWith(".pdf") ? await pdfToText(f) : await f.text();
      if (!t) throw new Error("No text found in that file");
      setText(t);
      toast.success("Resume read — remember to save it");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't read that file"); }
    setBusy(false);
  }

  async function save() {
    if (!text.trim()) { toast.error("Add your resume text first"); return; }
    await supabase.from("resumes").update({ is_active: false }).eq("is_active", true);
    const { error } = await supabase.from("resumes").insert({ content: text.slice(0, 50000), title: "Resume", is_active: true });
    if (error) { toast.error(error.message); return; }
    toast.success("Resume saved. Rescan on Radar to update match scores.");
    qc.invalidateQueries();
  }

  return (
    <div>
      <PageHeader title="Resume match" sub="Upload your resume, paste a job description, and see how well they match.">
        <Button variant="outline" onClick={() => saveVersion(text, "original", `Snapshot ${new Date().toLocaleString()}`)}>Save as version</Button>
        <Button variant="outline" onClick={runImprove} disabled={!!aiBusy}>{aiBusy === "improve" ? "Improving…" : "Improve with AI"}</Button>
        <Button onClick={save}>Save resume</Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Your resume</h2>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-secondary px-3 py-1.5 text-sm"><Upload size={15} />{busy ? "Reading…" : "Upload PDF / TXT"}
              <input type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume or upload a PDF" className="min-h-[480px] bg-card" />
        </section>
        <section className="space-y-5 rounded-xl border bg-card p-5">
          <ScoreRing score={result?.score ?? 0} />
          <div className="text-center text-xs text-muted-foreground">{ai ? (ai.source === "ai" ? "AI analysis" : "Built-in matcher") : "Built-in matcher (instant)"}</div>
          <Button size="sm" className="w-full" variant="secondary" onClick={runAnalyze} disabled={!!aiBusy}>{aiBusy === "analyze" ? "Analysing…" : "Deep analysis with AI"}</Button>
          {!result ? <p className="text-center text-sm text-muted-foreground">Add both texts to see your score.</p> : (
            <>
              <div><h3 className="mb-2 text-sm font-semibold">Matched ({result.matched.length})</h3><div className="flex flex-wrap gap-1.5">{result.matched.map((k) => <span key={k} className="rounded-full bg-success/15 px-2.5 py-1 text-xs text-success">{k}</span>)}</div></div>
              <div><h3 className="mb-2 text-sm font-semibold">Missing ({result.missing.length})</h3><div className="flex flex-wrap gap-1.5">{result.missing.map((k) => <span key={k} className="rounded-full bg-destructive/15 px-2.5 py-1 text-xs text-destructive">{k}</span>)}</div></div>
              {result.suggestions.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">{result.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>}
            </>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="pt-1.5 font-semibold">Job description</h2>
          <Textarea value={job} onChange={(e) => setJob(e.target.value)} placeholder="Paste a job description" className="min-h-[480px] bg-card" />
        </section>
      </div>
      {diff && (
        <section className="mt-8 space-y-3 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Suggested rewrites ({diff.changes.length})</h2>
            <div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setDiff(null)}>Discard</Button><Button size="sm" onClick={applyDiff}>Apply</Button></div></div>
          <p className="text-xs text-muted-foreground">Check every line — fill in any [X] placeholders with your real numbers.</p>
          {diff.changes.map((c, i) => (
            <div key={i} className="grid gap-2 text-sm md:grid-cols-2">
              <div className="rounded-md bg-destructive/10 p-2 line-through decoration-destructive/40">{c.before}</div>
              <div className="rounded-md bg-success/10 p-2">{c.after}</div>
            </div>))}
        </section>
      )}
      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Version history</h2>
        {!versions?.length ? <p className="text-sm text-muted-foreground">No versions yet. Save one, improve with AI, or tailor for a job.</p> :
          <ul className="space-y-2">{versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
              <div className="min-w-0"><div className="truncate text-sm font-medium">{v.label}</div><div className="text-xs capitalize text-muted-foreground">{v.kind} · {new Date(v.created_at).toLocaleString()}</div></div>
              <Button size="sm" variant="outline" onClick={() => { setText(v.content); toast.success("Restored into the editor — click Save resume to make it active"); }}>Restore</Button>
            </li>))}</ul>}
      </section>
    </div>
  );
}
