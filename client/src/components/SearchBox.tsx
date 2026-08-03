/**
 * The big search field that opens the overview and the projects page.
 * One component so the two never drift apart in height, padding or behaviour.
 */
export default function SearchBox({
  value,
  onChange,
  placeholder,
  clearLabel = "Clear",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  clearLabel?: string;
}) {
  return (
    <div className="relative">
      <svg viewBox="0 0 24 24" aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-11 text-[15px] text-slate-700 shadow-card outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      />
      {value && (
        <button onClick={() => onChange("")} aria-label={clearLabel}
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
          ✕
        </button>
      )}
    </div>
  );
}
