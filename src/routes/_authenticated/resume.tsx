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
  const result = useMemo(() => (text && job ? matchResume(text, job) : null), [text, job]);

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
    </div>
  );
}
