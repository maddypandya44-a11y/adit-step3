# Workly

Your job search, on autopilot — free for everyone.

- **Resume match** — paste your resume and a job description to see a 0–100 match score, matched/missing keywords, and suggestions.
- **Radar** — watch companies on Greenhouse, Lever and Ashby job boards; new roles are matched against your saved resume automatically.
- **Applications** — a simple tracker from saved → applied → interview → offer → rejected.

## Development

```sh
npm i
npm run dev
```

## Credits

- Keyword matching inspired by [Resume-Matcher](https://github.com/srbhr/Resume-Matcher) — the local matcher in `src/lib/match.ts` is our TypeScript adaptation of its keyword-extraction idea.
- Built with [Lovable](https://lovable.dev).

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back into Lovable and show up in
> the editor, ready for your next prompt.
<!-- LOVABLE:END -->
