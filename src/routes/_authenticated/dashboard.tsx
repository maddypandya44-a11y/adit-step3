import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Workly" }] }),
  component: Dashboard,
});

async function count(table: "resumes" | "jobs" | "applications" | "watched_companies") {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => ({ resumes: await count("resumes"), companies: await count("watched_companies"), jobs: await count("jobs"), apps: await count("applications") }),
  });
  const steps = [
    { done: (data?.resumes ?? 0) > 0, label: "Add your resume", to: "/resume" as const },
    { done: (data?.companies ?? 0) > 0, label: "Pick companies to watch", to: "/radar" as const },
    { done: (data?.jobs ?? 0) > 0, label: "Scan for jobs and see your match %", to: "/radar" as const },
    { done: (data?.apps ?? 0) > 0, label: "Save a job to your tracker", to: "/jobs" as const },
  ];
  return (
    <div className="max-w-4xl">
      <PageHeader title="Dashboard" sub="Your job search at a glance." />
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[["Resumes", data?.resumes], ["Companies", data?.companies], ["Jobs found", data?.jobs], ["Applications", data?.apps]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border bg-card p-5"><div className="text-3xl font-bold">{v ?? "–"}</div><div className="text-sm text-muted-foreground">{l}</div></div>
        ))}
      </div>
      <h2 className="mb-3 text-lg font-semibold">Getting started</h2>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.label}><Link to={s.to} className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-secondary">
            <span className={`grid size-7 place-items-center rounded-full text-sm font-semibold ${s.done ? "bg-success text-primary-foreground" : "bg-surface"}`}>{s.done ? "✓" : i + 1}</span>{s.label}
          </Link></li>
        ))}
      </ol>
    </div>
  );
}
