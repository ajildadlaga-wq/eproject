import type { Lang } from "./translations";

const MN_WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

export type DateStyle = "short" | "medium" | "long";

/**
 * Locale-aware date formatting.
 *   mn short  -> "7 сарын 3"
 *   mn medium -> "2026 оны 7 сарын 3"
 *   mn long   -> "Баасан, 2026 оны 7 сарын 3"
 *   en short  -> "Jul 3"
 *   en medium -> "Jul 3, 2026"
 *   en long   -> "Fri, Jul 3, 2026"
 */
export function formatDate(input: string | Date | null | undefined, lang: Lang, style: DateStyle = "medium"): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return String(input);

  if (lang === "mn") {
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    if (style === "short") return `${m} сарын ${day}`;
    if (style === "long") return `${MN_WEEKDAYS[d.getDay()]}, ${y} оны ${m} сарын ${day}`;
    return `${y} оны ${m} сарын ${day}`;
  }

  const opts: Intl.DateTimeFormatOptions =
    style === "short" ? { month: "short", day: "numeric" }
    : style === "long" ? { weekday: "short", year: "numeric", month: "short", day: "numeric" }
    : { year: "numeric", month: "short", day: "numeric" };
  return d.toLocaleDateString("en-US", opts);
}

const EN_MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7,
  august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Converts a gantt-task-react calendar label (English, e.g. "August, 2026" or
 * "August") to Mongolian ("2026 оны 8-р сар" / "8-р сар"). Returns null if the
 * text isn't a recognized English month label (so it's left untouched).
 */
export function mnCalendarLabel(text: string): string | null {
  const m = text.trim().match(/^([A-Za-z]+)(?:,?\s*(\d{4}))?$/);
  if (!m) return null;
  const num = EN_MONTHS[m[1].toLowerCase()];
  if (!num) return null;
  return m[2] ? `${m[2]} оны ${num}-р сар` : `${num}-р сар`;
}

/** Date + time, e.g. "Баасан, 2026 оны 7 сарын 3 22:34" / "Fri, Jul 3, 2026, 10:34 PM". */
export function formatDateTime(input: string | null | undefined, lang: Lang): string {
  if (!input) return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);
  const datePart = formatDate(input, lang, "long");
  if (lang === "mn") {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${datePart} ${hh}:${mm}`;
  }
  return `${datePart}, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}
