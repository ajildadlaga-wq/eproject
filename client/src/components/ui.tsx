// Small presentational helpers shared across pages.

/**
 * What a page shows when a query fails.
 *
 * This exists because of an afternoon lost to its absence. A screen that
 * renders "nothing here" whether the answer is an empty list or a refused
 * request tells you nothing, and the two look identical from the outside.
 * A failure should say so, and say what the database said.
 */
export function ErrorCard({ error, title }: { error: unknown; title: string }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
      <div className="flex items-start gap-2.5">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16.5v.01" />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{title}</p>
          <p className="mt-1 break-words font-mono text-xs text-rose-700 dark:text-rose-300">{message}</p>
        </div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500",
  "bg-brand-500", "bg-violet-500", "bg-fuchsia-500", "bg-teal-500",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 28 }: { name: string | null; size?: number }) {
  const label = name?.trim() || "—";
  const color = AVATAR_COLORS[hash(label) % AVATAR_COLORS.length];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={label}
    >
      {label === "—" ? "?" : initials(label)}
    </span>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "danger" }) {
  const fill = tone === "danger" ? "bg-rose-500" : "bg-brand-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-[80px] overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${fill}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-slate-500">{value}%</span>
    </div>
  );
}
