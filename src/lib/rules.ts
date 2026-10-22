// Post-LLM scoring rules ported from JobRadar (suvamneog/jobradar, MIT). Pure + deterministic.
export const SENIOR_TITLE = /\b(senior|sr\.?|staff|principal|lead|director|head of|vp)\b/i;
export const CAP = 3;

export type RuleInput = { score: number; title: string; seniority?: string | null | undefined; skillsFit?: "strong" | "partial" | "weak"; domainFit?: "strong" | "partial" | "weak" };
export type RuleOutput = { score: number; rule: string | null };

export function applyScoringRules(i: RuleInput): RuleOutput {
  let score = Math.max(0, Math.min(10, Math.round(i.score * 10) / 10));
  const rules: string[] = [];
  const userSenior = /senior|staff|principal|lead|director/i.test(i.seniority ?? "");
  if (SENIOR_TITLE.test(i.title) && !userSenior && score > CAP) { score = CAP; rules.push("senior_title_cap"); }
  if (i.skillsFit === "weak" && i.domainFit === "weak" && score > CAP) { score = CAP; rules.push("weak_skills_and_domain_cap"); }
  return { score, rule: rules.length ? rules.join(",") : null };
}

/** Local estimate when no LLM is available: matcher % ÷ 10, then the same rules. */
export function estimatedScore(matchPercent: number | null, title: string, seniority?: string | null): RuleOutput {
  return applyScoringRules({ score: (matchPercent ?? 0) / 10, title, seniority });
}

/** Follow-up schedule: +5 and +10 days after applying. */
export function followUpDates(appliedAt: Date): Date[] {
  return [5, 10].map((d) => new Date(appliedAt.getTime() + d * 864e5));
}

export function budgetResetAt(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function isOverBudget(used: number, budget: number) { return used >= budget; }
