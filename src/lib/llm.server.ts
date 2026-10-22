import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { decrypt } from "./crypto.server";
import { budgetResetAt, isOverBudget } from "./rules";

type Db = SupabaseClient<Database>;
export type LlmResult<T> = { ok: true; data: T; model: string } | { ok: false; reason: "budget" | "unavailable" | "invalid"; message: string };

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

function today() { return new Date().toISOString().slice(0, 10); }

async function usage(db: Db, userId: string) {
  const { data } = await db.from("ai_usage").select("tokens_used").eq("user_id", userId).eq("day", today()).maybeSingle();
  return data?.tokens_used ?? 0;
}
async function logUsage(db: Db, userId: string, tokens: number) {
  const used = await usage(db, userId);
  await db.from("ai_usage").upsert({ user_id: userId, day: today(), tokens_used: used + tokens }, { onConflict: "user_id,day" });
}

async function endpointFor(db: Db, userId: string) {
  const { data: p } = await db.from("profiles").select("llm_api_key_encrypted").eq("user_id", userId).maybeSingle();
  if (p?.llm_api_key_encrypted) {
    try {
      const k = await decrypt(p.llm_api_key_encrypted);
      return { url: `${(process.env["LLM_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`, key: k, model: process.env["LLM_MODEL"] ?? "gpt-4o-mini", own: true };
    } catch { /* fall through to platform AI */ }
  }
  if (process.env["LOVABLE_API_KEY"]) return { url: GATEWAY, key: process.env["LOVABLE_API_KEY"], model: DEFAULT_MODEL, own: false };
  if (process.env["LLM_BASE_URL"] && process.env["LLM_API_KEY"]) return { url: `${process.env["LLM_BASE_URL"].replace(/\/$/, "")}/chat/completions`, key: process.env["LLM_API_KEY"], model: process.env["LLM_MODEL"] ?? "gpt-4o-mini", own: false };
  return null;
}

/** One LLM entry point. Enforces the daily token budget (skipped for a user's own key), zod-validates JSON, retries once. */
export async function callLlm<T>(db: Db, userId: string, opts: { system: string; user: string; schema: z.ZodType<T> }): Promise<LlmResult<T>> {
  const ep = await endpointFor(db, userId);
  if (!ep) return { ok: false, reason: "unavailable", message: "AI isn't available right now; using the built-in matcher." };
  const budget = Number(process.env["DAILY_TOKEN_BUDGET"] ?? 200000);
  if (!ep.own && isOverBudget(await usage(db, userId), budget)) {
    return { ok: false, reason: "budget", message: `Daily AI limit reached, resets at ${budgetResetAt().toUTCString()}. Using the built-in matcher meanwhile.` };
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${ep.key}` },
        body: JSON.stringify({ model: ep.model, response_format: { type: "json_object" }, messages: [{ role: "system", content: `${opts.system}\nReply with JSON only.` }, { role: "user", content: opts.user }] }),
      });
      if (res.status === 429) return { ok: false, reason: "budget", message: "AI is busy — try again later." };
      if (!res.ok) { console.error("LLM error", res.status, await res.text()); return { ok: false, reason: "unavailable", message: "AI isn't available right now; using the built-in matcher." }; }
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } };
      if (!ep.own) await logUsage(db, userId, body.usage?.total_tokens ?? 1000);
      const text = (body.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim();
      const parsed = opts.schema.safeParse(JSON.parse(text));
      if (parsed.success) return { ok: true, data: parsed.data, model: ep.model };
    } catch (e) { console.error("LLM call failed", e); }
  }
  return { ok: false, reason: "invalid", message: "AI reply couldn't be read; using the built-in matcher." };
}
