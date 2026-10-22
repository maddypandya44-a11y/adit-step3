import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scanRadar, scoreJobs, validateBoard } from "@/lib/radar.functions";
import { ATS_LIST, ATS_SLUG_HINT, type Ats } from "@/lib/ats";
import { PageHeader } from "@/components/PageHeader";
import { MatchBadge } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/radar")({
  head: () => ({ meta: [{ title: "Radar — Workly" }] }),
  component: RadarPage,
});

const STARTERS: { name: string; ats: Ats; slug: string }[] = [
  { name: "Stripe", ats: "greenhouse", slug: "stripe" },
  { name: "Airbnb", ats: "greenhouse", slug: "airbnb" },
  { name: "Spotify", ats: "lever", slug: "spotify" },
  { name: "Notion", ats: "ashby", slug: "notion" },
  { name: "Ramp", ats: "ashby", slug: "ramp" },
  { name: "Figma", ats: "greenhouse", slug: "figma" },
  { name: "Discord", ats: "greenhouse", slug: "discord" },
  { name: "Plaid", ats: "lever", slug: "plaid" },
  { name: "Linear", ats: "ashby", slug: "linear" },
  { name: "OpenAI", ats: "ashby", slug: "openai" },
];

function RadarPage() {
  const qc = useQueryClient();
  const scan = useServerFn(scanRadar);
  const score = useServerFn(scoreJobs);
  const validate = useServerFn(validateBoard);
  const [checking, setChecking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [form, setForm] = useState<{ name: string; ats: Ats; slug: string }>({ name: "", ats: "greenhouse", slug: "" });
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: async () => (await supabase.from("watched_companies").select("*").order("name")).data ?? [] });
  const { data: fresh } = useQuery({
    queryKey: ["fresh-jobs"],
    queryFn: async () => {
      const rows = (await supabase.from("jobs").select("id,company,title,location,url,match_score,first_seen_at,job_scores(llm_score,reason,model,rule_applied)").eq("status", "open").gte("first_seen_at", new Date(Date.now() - 7 * 864e5).toISOString()).limit(300)).data ?? [];
      return rows.map((j) => ({ ...j, s: j.job_scores?.[0] })).sort((a, b) => (Number(b.s?.llm_score ?? -1) - Number(a.s?.llm_score ?? -1)) || ((b.match_score ?? 0) - (a.match_score ?? 0))).slice(0, 15);
    },
  });

  async function add(rows: typeof STARTERS) {
    const { error } = await supabase.from("watched_companies").upsert(rows, { onConflict: "user_id,ats,slug", ignoreDuplicates: true });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["companies"] });
  }
  async function remove(id: string) {
    await supabase.from("watched_companies").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["companies"] });
  }
  async function runScan() {
    setScanning(true);
    try {
      const res = await scan();
      const failed = res.filter((r) => r.error);
      toast.success(`Scan done: ${res.reduce((a, r) => a + r.found, 0)} open roles, ${res.reduce((a, r) => a + r.added, 0)} new`);
      failed.forEach((f) => toast.error(`${f.company}: ${f.error}`));
      qc.invalidateQueries();
      const sc = await score();
      if (sc.message) toast.message(sc.message);
      if (sc.scored) toast.success(`Scored ${sc.scored} roles${sc.estimated ? " (estimated)" : ""}${sc.alerts ? ` · ${sc.alerts} strong matches` : ""}`);
      qc.invalidateQueries();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Scan failed, try again later"); }
    setScanning(false);
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Radar" sub="Watch company job boards. New roles are matched against your saved resume.">
        <Button onClick={runScan} disabled={scanning || !companies?.length}>{scanning ? "Scanning…" : "Scan now"}</Button>
      </PageHeader>
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Watched companies</h2>
          {companies?.length === 0 && <Button variant="outline" className="mb-3" onClick={() => add(STARTERS)}>Add starter companies</Button>}
          <ul className="mb-4 space-y-2">{companies?.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <div><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.ats} · {c.slug}{c.last_scanned_at ? ` · scanned ${new Date(c.last_scanned_at).toLocaleString()}` : ""}</div></div>
              <button aria-label={`Remove ${c.name}`} onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
            </li>))}</ul>
          <form className="space-y-2 rounded-lg border bg-card p-4" onSubmit={async (e) => {
            e.preventDefault(); if (!form.name.trim() || !form.slug.trim()) { toast.error("Add a name and board"); return; }
            setChecking(true);
            const slug = ["workday", "oracle"].includes(form.ats) ? form.slug.trim() : form.slug.trim().toLowerCase();
            const v = await validate({ data: { ats: form.ats, slug } }).catch(() => ({ ok: false as const, error: "Couldn't check that board" }));
            setChecking(false);
            if (!v.ok) { toast.error(v.error); return; }
            toast.success(`${form.name}: ${v.count} open roles found`);
            await add([{ name: form.name.trim(), ats: form.ats, slug }]); setForm({ ...form, name: "", slug: "" });
          }}>
            <div className="text-sm font-medium">Add a company</div>
            <Input placeholder="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="flex gap-2">
              <select value={form.ats} onChange={(e) => setForm({ ...form, ats: e.target.value as Ats })} className="h-9 rounded-md border bg-background px-2 text-sm">
                {ATS_LIST.map((a) => <option key={a} value={a} className="capitalize">{a}</option>)}
              </select>
              <Input placeholder={ATS_SLUG_HINT[form.ats]} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">The board name is the last part of the company's careers link, e.g. boards.greenhouse.io/<b>stripe</b>.</p>
            <Button type="submit" size="sm" disabled={checking}>{checking ? "Checking board…" : "Add"}</Button>
          </form>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">New this week — top scored</h2>
          {!fresh?.length ? <p className="text-sm text-muted-foreground">Run a scan to see new roles.</p> :
            <ul className="space-y-2">{fresh.map((j) => (
              <li key={j.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
                <div className="min-w-0 flex-1"><a href={j.url ?? "#"} target="_blank" rel="noreferrer" className="font-medium hover:text-primary">{j.title}</a><div className="text-xs text-muted-foreground">{j.company}{j.location ? ` · ${j.location}` : ""}</div>
                  {j.s && <div className="mt-1 text-xs text-muted-foreground">{j.s.reason}{j.s.rule_applied ? " (capped: seniority/fit rule)" : ""}</div>}</div>
                {j.s ? <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{Number(j.s.llm_score)}/10{j.s.model === "estimated" ? " est." : ""}</span> : <MatchBadge score={j.match_score} />}
              </li>))}</ul>}
        </section>
      </div>
    </div>
  );
}
