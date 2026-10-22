export function ScoreRing({ score }: { score: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto size-40">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} strokeWidth="10" fill="none" className="stroke-surface" />
        <circle cx="60" cy="60" r={r} strokeWidth="10" fill="none" strokeLinecap="round" className="stroke-primary transition-[stroke-dashoffset] duration-700" strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-4xl font-bold">{score}</div><div className="text-xs text-muted-foreground">Match score</div></div></div>
    </div>
  );
}

export function MatchBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">No resume</span>;
  return <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{score}% match</span>;
}
