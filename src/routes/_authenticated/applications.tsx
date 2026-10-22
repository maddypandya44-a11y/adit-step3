import { createFileRoute } from "@tanstack/react-router";
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

  async function update(id: string, patch: { status?: Status; notes?: string }) {
    const { error } = await supabase.from("applications").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["apps"] });
  }
  async function remove(id: string) {
    await supabase.from("applications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["apps"] });
  }

  return (
    <div>
      <PageHeader title="Applications" sub="Drag-free tracker: change a card's stage with its menu. Saves automatically." />
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
