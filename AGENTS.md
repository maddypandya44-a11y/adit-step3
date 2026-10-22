# Workly

Job search assistant: AI resume matching, company job-board radar, application tracker.

Ported from the `adit-step1` repo (same Lovable TanStack Start stack). Backend runs on Lovable Cloud.

## Stack decisions

- Keep the TanStack Start stack as ported; never re-theme or rewrite whole app files — small batched edits only.
- App-internal server logic uses `createServerFn` (e.g. `src/lib/radar.functions.ts`); ATS job-board fetching (Greenhouse / Lever / Ashby) happens server-side only.
- Resume matching is a local keyword matcher (`src/lib/match.ts`) inspired by Resume-Matcher — credit it in the README.
- All user data lives in `public` tables (resumes, watched_companies, jobs, applications) with owner-only RLS (`auth.uid() = user_id`). New user-scoped tables must follow the same pattern plus GRANTs.
- Toaster (sonner) is mounted once in `src/routes/__root.tsx`; use `toast` from `sonner`.
- PDF text extraction (`src/lib/pdf.ts`) is browser-only via pdfjs-dist.

Subdirectories have their own AGENTS.md when present; read them before changing files there.

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
