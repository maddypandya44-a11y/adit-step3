# Workly — continuation roadmap (from uploaded continuation prompt)

Source (adit-step1 repo) is now ported into this project; Lovable Cloud connected.

## Done
- [x] STEP 0 audit (see chat report)
- [x] Port full app source, schema (resumes, watched_companies, jobs, applications w/ RLS + GRANTs), tests, assets
- [x] Enable Lovable Cloud + email auth + Google sign-in
- [x] Fix: toasts never appear → Sonner mounted in __root.tsx
- [x] Fix: tab title "Lovable App" → "Workly — Your job search, on autopilot" + real meta/OG/favicon
- [x] Paywall audit: clean (only "Stripe" the company name matches)
- [x] README credits (Resume-Matcher: srbhr/Resume-Matcher)

## Remaining phases
- [ ] E2E flow verification (signup → confirm → sign in → dashboard → radar scan → jobs → resume match → applications)
- [ ] Resume-Matcher port phase 2: parsing improvements, rewrite suggestions, "improve" → resume_version table
- [ ] JobRadar phase 2: LLM scoring with rules + local fallback, daily token budget, scheduled digest email + in-app alerts (alerts table, cron)
- [ ] New tables for later phases: profiles, resume_versions, job_scores, follow_ups, alerts, integrations (owner-only RLS + GRANTs each)
- [ ] AI tailoring + apply packages (PDF/DOCX export, confirmation before submit)
- [ ] Follow-ups (Gmail OAuth w/ approval + caps), integrations page
- [ ] Polish + tests

## Hard rules
- NO paywall of any kind; every user gets everything instantly. Only invisible generous rate limits ("try again later" + reset time).
- Optional per-user LLM API key.
- Resumes private per user (RLS). Secrets server-side only. Confirmation before any application submit / email send.
- Keep Vite/React (TanStack) stack. Do not re-theme, do not regenerate whole files, small batched changes.
