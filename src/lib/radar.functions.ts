import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const scanRadar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { scanForUser } = await import("./core.server");
    return scanForUser(context.supabase, context.userId);
  });

export const scoreJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { scoreJobsForUser } = await import("./core.server");
    return scoreJobsForUser(context.supabase, context.userId);
  });

/** Live validation for "add company": fetch the board and report how many roles it has. */
export const validateBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ats: z.enum(["greenhouse", "lever", "ashby", "workable", "workday", "oracle"]), slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { fetchBoard } = await import("./ats");
    try { return { ok: true as const, count: (await fetchBoard(data.ats, data.slug)).length }; }
    catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Board not reachable" }; }
  });
