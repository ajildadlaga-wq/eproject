// Small presentational helpers shared across pages.

const AVATAR_COLORS = [
  "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500",
  "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500", "bg-teal-500",
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
  const fill = tone === "danger" ? "bg-rose-500" : "bg-violet-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-[80px] overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-500">{value}%</span>
    </div>
  );
}
