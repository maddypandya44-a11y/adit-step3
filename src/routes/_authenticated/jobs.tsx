import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { tailorForJob } from "@/lib/ai.functions";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { MatchBadge } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Workly" }] }),
  component: Jobs,
});

function Jobs() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => (await supabase.from("jobs").select("id,company,title,location,url,match_score,matched_keywords,missing_keywords,first_seen_at,job_scores(llm_score,reason,model)").eq("status", "open").order("match_score", { ascending: false, nullsFirst: false }).limit(500)).data ?? [],
  });
  const list = (jobs ?? []).filter((j) => j.title.toLowerCase().includes(q.toLowerCase()) && (j.location ?? "").toLowerCase().includes(loc.toLowerCase()));

  const tailor = useServerFn(tailorForJob);
  const navigate = useNavigate();
  const [tailoring, setTailoring] = useState<string | null>(null);
  async function doTailor(id: string) {
    setTailoring(id);
    try {
      const r = await tailor({ data: { jobId: id } });
      if (!r.ok) { toast.error(r.message); return; }
      toast.success("Tailored resume and cover letter drafted — review before applying");
      navigate({ to: "/package/$id", params: { id: r.packageId } });
    } catch { toast.error("Couldn't tailor right now — try again later"); }
    finally { setTailoring(null); }
  }
  async function save(j: (typeof list)[number]) {
    const { error } = await supabase.from("applications").insert({ job_id: j.id, company: j.company, title: j.title, url: j.url, status: "saved" });
    error ? toast.error(error.message) : toast.success("Saved to your tracker");
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Jobs" sub="Open roles from the companies you watch, ranked by how well they match your resume." />
      <div className="mb-6 flex flex-wrap gap-3">
        <Input placeholder="Role, e.g. engineer" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Input placeholder="Location, e.g. remote" value={loc} onChange={(e) => setLoc(e.target.value)} className="max-w-xs" />
      </div>
      {isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />)}</div>
        : list.length === 0 ? <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">No jobs yet. <Link to="/radar" className="text-primary">Add companies and scan on Radar</Link>.</div>
        : <ul className="space-y-3">{list.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">{j.company.slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{j.title}</div>
              <div className="text-sm text-muted-foreground">{j.company}{j.location ? ` · ${j.location}` : ""}</div>
              {j.job_scores?.[0] && <div className="mt-1 text-xs"><b>{Number(j.job_scores[0].llm_score)}/10{j.job_scores[0].model === "estimated" ? " (estimated)" : ""}</b> · <span className="text-muted-foreground">{j.job_scores[0].reason}</span></div>}
              {j.missing_keywords.length > 0 && <div className="mt-1 text-xs text-muted-foreground">Missing: {j.missing_keywords.slice(0, 5).join(", ")}</div>}
            </div>
            <MatchBadge score={j.match_score} />
            <Button variant="outline" size="sm" onClick={() => save(j)}>Save</Button>
            <Button variant="secondary" size="sm" disabled={tailoring === j.id} onClick={() => doTailor(j.id)}>{tailoring === j.id ? "Tailoring…" : "Tailor"}</Button>
            {j.url && <Button asChild size="sm"><a href={j.url} target="_blank" rel="noreferrer">Apply <ExternalLink size={14} /></a></Button>}
          </li>))}</ul>}
    </div>
  );
}
