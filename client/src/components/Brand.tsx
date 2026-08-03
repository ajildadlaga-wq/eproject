// Brand.tsx — E-Project logo mark and wordmark.
//
// The mark is a stylised "E" built from three Gantt bars, with an approval
// check-mark badge: the two ideas the product is built on (schedule + approval).

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="E-Project"
    >
      <rect x="18" y="18" width="264" height="264" rx="58" fill="currentColor" />
      <rect x="68" y="82" width="166" height="29" rx="14.5" fill="#FFFFFF" />
      <rect x="68" y="136" width="114" height="29" rx="14.5" fill="#FFFFFF" opacity="0.78" />
      <rect x="68" y="190" width="166" height="29" rx="14.5" fill="#FFFFFF" opacity="0.56" />
      <circle cx="232" cy="222" r="52" fill="#22A15C" stroke="#FFFFFF" strokeWidth="14" />
      <path
        d="M210 222 l16 17 l28 -33"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Full lockup: mark + wordmark.
 * `tone` picks the text colour for light or dark backgrounds.
 */
export function Logo({
  size = 32,
  tone = "light",
  subtitle,
  className = "",
}: {
  size?: number;
  tone?: "light" | "dark";
  subtitle?: string;
  className?: string;
}) {
  const title = tone === "dark" ? "text-white" : "text-brand";
  const sub = tone === "dark" ? "text-slate-400" : "text-slate-500 dark:text-slate-400";
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="text-brand" />
      <span className="min-w-0 leading-tight">
        <span className={`block font-bold tracking-tight ${title}`} style={{ fontSize: size * 0.5 }}>
          E-Project
        </span>
        {subtitle && (
          <span className={`block truncate ${sub}`} style={{ fontSize: size * 0.33 }}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

export default Logo;
