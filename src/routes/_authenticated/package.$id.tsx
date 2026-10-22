import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { exportDocx, exportPdf } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/package/$id")({
  head: () => ({ meta: [{ title: "Application package — Workly" }] }),
  component: PackagePage,
});

const LABELS: Record<string, string> = { why_company: "Why this company?", why_role: "Why this role?", work_authorisation: "Work authorisation (fill in yourself)", salary_expectation: "Salary expectation", notice_period: "Notice period" };

function PackagePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: pkg, isLoading } = useQuery({
    queryKey: ["package", id],
    queryFn: async () => (await supabase.from("application_packages").select("*, resume_versions(id,content,label), jobs(title,company,url), applications(id,status)").eq("id", id).maybeSingle()).data,
  });
  const [resume, setResume] = useState("");
  const [letter, setLetter] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!pkg) return;
    setResume(pkg.resume_versions?.content ?? "");
    setLetter(pkg.cover_letter);
    setAnswers((pkg.answers ?? {}) as Record<string, string>);
  }, [pkg]);

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-card" />;
  if (!pkg) return <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Package not found. <Link to="/jobs" className="text-primary">Back to jobs</Link></div>;
  const name = `${pkg.jobs?.company ?? "job"}-${pkg.jobs?.title ?? ""}`.replace(/[^a-z0-9]+/gi, "-").slice(0, 60);

  async function save(status?: "approved" | "submitted") {
    if (pkg?.resume_version_id) await supabase.from("resume_versions").update({ content: resume }).eq("id", pkg.resume_version_id);
    const { error } = await supabase.from("application_packages").update({ cover_letter: letter, answers, updated_at: new Date().toISOString(), ...(status ? { status } : {}) }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Package approved. Open the posting to apply." : "Saved");
    qc.invalidateQueries({ queryKey: ["package", id] });
  }
  async function markApplied() {
    if (!pkg?.applications?.id) return;
    if (!confirm("Mark this application as Applied? Only do this after you've submitted on the company's site.")) return;
    await supabase.from("applications").update({ status: "applied", applied_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", pkg.applications.id);
    await save("submitted");
    toast.success("Marked as applied — follow-up drafts will appear on Applications");
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title={`${pkg.jobs?.title ?? "Application"} · ${pkg.jobs?.company ?? ""}`} sub={`Status: ${pkg.status}. Review and edit everything before you apply — nothing is sent for you.`}>
        <Button variant="outline" onClick={() => save()}>Save</Button>
        <Button onClick={() => save("approved")}>Approve</Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Tailored resume</h2>
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => exportPdf(resume, `resume-${name}`)}>PDF</Button><Button size="sm" variant="outline" onClick={() => exportDocx(resume, `resume-${name}`)}>DOCX</Button></div></div>
          <Textarea value={resume} onChange={(e) => setResume(e.target.value)} className="min-h-[460px] bg-card text-sm" />
        </section>
        <section className="space-y-2">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Cover letter</h2>
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => exportPdf(letter, `cover-letter-${name}`)}>PDF</Button><Button size="sm" variant="outline" onClick={() => exportDocx(letter, `cover-letter-${name}`)}>DOCX</Button></div></div>
          <Textarea value={letter} onChange={(e) => setLetter(e.target.value)} className="min-h-[460px] bg-card text-sm" />
        </section>
      </div>
      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Common questions</h2>
        {Object.keys({ ...LABELS, ...answers }).map((k) => (
          <label key={k} className="block space-y-1 text-sm"><span className="text-muted-foreground">{LABELS[k] ?? k.replace(/_/g, " ")}</span>
            <Input value={answers[k] ?? ""} onChange={(e) => setAnswers({ ...answers, [k]: e.target.value })} /></label>
        ))}
      </section>
      <div className="flex flex-wrap gap-3">
        {pkg.jobs?.url && <Button asChild disabled={pkg.status === "draft"}><a href={pkg.jobs.url} target="_blank" rel="noreferrer">Open official posting <ExternalLink size={14} /></a></Button>}
        <Button variant="outline" onClick={markApplied}>I've applied</Button>
      </div>
      <p className="text-xs text-muted-foreground">Workly never submits applications for you. Apply on the company's own page, then mark it applied here.</p>
    </div>
  );
}
