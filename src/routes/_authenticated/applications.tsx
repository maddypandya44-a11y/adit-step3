import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createFollowUps } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: [{ title: "Applications — Workly" }] }),
  component: Board,
});

const COLS = ["saved", "applied", "interview", "offer", "rejected"] as const;
type Status = (typeof COLS)[number];

function Board() {
  const qc = useQueryClient();
  const { data: apps } = useQuery({ queryKey: ["apps"], queryFn: async () => (await supabase.from("applications").select("*").order("updated_at", { ascending: false })).data ?? [] });

  const makeFollowUps = useServerFn(createFollowUps);
  const { data: due } = useQuery({
    queryKey: ["followups"],
    queryFn: async () => (await supabase.from("follow_ups").select("*, applications(company,title,url)").in("status", ["draft", "approved"]).lte("due_at", new Date(Date.now() + 2 * 864e5).toISOString()).order("due_at")).data ?? [],
  });
  async function update(id: string, patch: { status?: Status; notes?: string }) {
    const extra = patch.status === "applied" ? { applied_at: new Date().toISOString() } : {};
    const { error } = await supabase.from("applications").update({ ...patch, ...extra, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (patch.status === "applied") {
      makeFollowUps({ data: { applicationId: id } }).then((r) => { if (r.created) toast.success("Follow-up drafts scheduled for +5 and +10 days"); qc.invalidateQueries({ queryKey: ["followups"] }); }).catch(() => toast.error("Couldn't draft follow-ups — try again later"));
    }
    qc.invalidateQueries({ queryKey: ["apps"] });
  }
  async function setFollowUp(id: string, patch: { body?: string; status?: "approved" | "sent" | "skipped"; sent_at?: string }) {
    if (patch.status === "sent") {
      const since = new Date(Date.now() - 864e5).toISOString();
      const { count } = await supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since);
      if ((count ?? 0) >= 10) { toast.error("You've sent 10 follow-ups in the last 24h — try again later."); return; }
    }
    const { error } = await supabase.from("follow_ups").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["followups"] });
  }
  async function remove(id: string) {
    await supabase.from("applications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["apps"] });
  }

  return (
    <div>
      <PageHeader title="Applications" sub="Drag-free tracker: change a card's stage with its menu. Saves automatically." />
      {!!due?.length && (
        <section className="mb-6 space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Follow-ups due ({due.length})</h2>
          {due.map((f) => {
            const linkedinSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${f.applications?.company ?? ""} recruiter`)}`;
            return (
              <article key={f.id} className="space-y-2 rounded-lg border bg-surface p-3">
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span><b className="capitalize text-foreground">{f.channel}</b> · {f.applications?.title} at {f.applications?.company}</span><span>Due {new Date(f.due_at).toLocaleDateString()} · {f.status}</span></div>
                {f.channel === "email" && <div className="text-sm font-medium">{f.subject}</div>}
                <Textarea defaultValue={f.body} className="min-h-20 text-xs" disabled={f.status !== "draft"} onBlur={(e) => e.target.value !== f.body && setFollowUp(f.id, { body: e.target.value })} />
                <div className="flex flex-wrap gap-2">
                  {f.status === "draft" && <Button size="sm" onClick={() => setFollowUp(f.id, { status: "approved" })}>Approve</Button>}
                  {f.status === "approved" && f.channel === "email" && <Button size="sm" asChild><a href={`mailto:?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(f.body)}`} onClick={() => setFollowUp(f.id, { status: "sent", sent_at: new Date().toISOString() })}>Open in email app</a></Button>}
                  {f.status === "approved" && f.channel === "linkedin" && <>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(f.body); toast.success("Copied"); }}>Copy message</Button>
                    <Button size="sm" asChild><a href={linkedinSearch} target="_blank" rel="noreferrer" onClick={() => setFollowUp(f.id, { status: "sent", sent_at: new Date().toISOString() })}>Find recruiter on LinkedIn</a></Button></>}
                  <Button size="sm" variant="ghost" onClick={() => setFollowUp(f.id, { status: "skipped" })}>Skip</Button>
                </div>
              </article>
            );
          })}
        </section>
      )}
      <div className="grid gap-4 overflow-x-auto md:grid-cols-5">
        {COLS.map((col) => {
          const items = (apps ?? []).filter((a) => a.status === col);
          return (
            <section key={col} className="min-w-56 rounded-xl bg-card p-3">
              <h2 className="mb-3 flex justify-between px-1 text-sm font-semibold capitalize">{col}<span className="text-muted-foreground">{items.length}</span></h2>
              <div className="space-y-2">{items.map((a) => (
                <article key={a.id} className="space-y-2 rounded-lg border bg-surface p-3">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-sm font-medium">{a.title}</div><div className="text-xs text-muted-foreground">{a.company}</div></div>
                    <button aria-label="Delete" onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </div>
                  <select aria-label="Stage" value={a.status} onChange={(e) => update(a.id, { status: e.target.value as Status })} className="h-8 w-full rounded-md border bg-background px-2 text-xs capitalize">
                    {COLS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Textarea defaultValue={a.notes} placeholder="Notes" className="min-h-14 text-xs" onBlur={(e) => e.target.value !== a.notes && update(a.id, { notes: e.target.value })} />
                  <div className="text-[11px] text-muted-foreground">Updated {new Date(a.updated_at).toLocaleDateString()}</div>
                </article>))}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
