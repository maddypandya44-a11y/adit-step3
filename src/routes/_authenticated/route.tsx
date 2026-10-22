import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Briefcase, FileText, KanbanSquare, Radar, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: Shell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", Icon: Briefcase },
  { to: "/resume", label: "Resume", Icon: FileText },
  { to: "/applications", label: "Applications", Icon: KanbanSquare },
  { to: "/radar", label: "Radar", Icon: Radar },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

function Shell() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen bg-background max-md:flex-col">
      <aside className="flex w-60 shrink-0 flex-col border-r p-4 max-md:w-full max-md:border-b max-md:border-r-0">
        <Link to="/" className="mb-6 px-2"><Logo /></Link>
        <nav className="flex gap-1 md:flex-col max-md:overflow-x-auto">
          {nav.map(({ to, label, Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "bg-secondary !text-foreground" }}>
              <Icon size={17} /> {label}
            </Link>
          ))}
        </nav>
        <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }} className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary max-md:hidden">
          <LogOut size={17} /> Log out
        </button>
      </aside>
      <main className="flex-1 p-6 md:p-10"><Outlet /></main>
    </div>
  );
}
