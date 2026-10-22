export const APP_NAME = "Workly";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-[17px] font-bold text-foreground">
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="18" className="fill-primary" />
        <path d="M11 14l4 13 5-9 5 9 4-13" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />
      </svg>
      {APP_NAME}
    </span>
  );
}
