import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Daily per-user radar: scan boards → score new jobs → alerts for jobs scoring ≥ 7.
export const Route = createFileRoute("/api/public/cron/daily-scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { scanForUser, scoreJobsForUser } = await import("@/lib/core.server");
        const { data } = await supabaseAdmin.from("watched_companies").select("user_id");
        const users = [...new Set((data ?? []).map((r) => r.user_id))];
        const summary: { user: string; ok: boolean; alerts?: number }[] = [];
        for (const u of users) {
          try {
            await scanForUser(supabaseAdmin, u);
            const s = await scoreJobsForUser(supabaseAdmin, u, 24);
            summary.push({ user: u.slice(0, 8), ok: true, alerts: s.alerts });
          } catch (e) {
            console.error("daily scan failed", u, e);
            summary.push({ user: u.slice(0, 8), ok: false });
          }
        }
        return Response.json({ users: users.length, summary });
      },
    },
  },
});
