import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Workly" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  async function wipe() {
    if (!confirm("Delete all your resumes, jobs, companies and applications? This can't be undone.")) return;
    for (const t of ["applications", "jobs", "watched_companies", "resumes"] as const) await supabase.from(t).delete().eq("user_id", user.id);
    toast.success("Your data was deleted");
  }
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" sub={user.email ?? ""} />
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-1 font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground">Gmail follow-ups, LinkedIn outreach drafts and AI tailoring are coming in the next phase.</p>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-1 font-semibold">Your data</h2>
        <p className="mb-4 text-sm text-muted-foreground">Remove everything you've stored in Workly.</p>
        <Button variant="destructive" onClick={wipe}>Delete my data</Button>
      </section>
      <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>Log out</Button>
    </div>
  );
}
