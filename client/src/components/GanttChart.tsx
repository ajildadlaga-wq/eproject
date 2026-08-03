import { useEffect, useMemo, useRef, useState } from "react";
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react";
import ErrorBoundary from "./ErrorBoundary";
import { useT } from "../i18n/LanguageContext";
import { formatDate, mnCalendarLabel } from "../i18n/date";
import type { Lang } from "../i18n/translations";

/** True below the Tailwind `sm` breakpoint (640px) — phones. */
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

export interface GanttItem {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  progress: number;
  highlight?: boolean;          // render red (bottleneck / at-risk)
  dependencies?: string[];
}

// gantt-task-react formats its own dates via Intl, which has no Mongolian data
// in many runtimes. So we render the left panel ourselves with formatDate, and
// (below) translate the calendar month labels via a DOM pass.
function makeListHeader(lang: Lang) {
  return function ListHeader({ headerHeight, fontFamily, fontSize }: { headerHeight: number; rowWidth: string; fontFamily: string; fontSize: string }) {
    const nameW = lang === "mn" ? 150 : 130;
    return (
      <div className="border-b border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
        style={{ height: headerHeight, fontFamily, fontSize, display: "flex", alignItems: "center" }}>
        <div className="px-3 font-semibold text-slate-500" style={{ width: nameW }}>{lang === "mn" ? "Даалгавар" : "Task"}</div>
        <div className="px-2 font-semibold text-slate-500" style={{ width: 200 }}>{lang === "mn" ? "Хугацаа" : "Timeline"}</div>
      </div>
    );
  };
}

function makeListTable(lang: Lang) {
  return function ListTable({ tasks, rowHeight, fontFamily, fontSize, setSelectedTask }: {
    tasks: GanttTask[]; rowHeight: number; rowWidth: string; fontFamily: string; fontSize: string;
    locale: string; selectedTaskId: string; setSelectedTask: (id: string) => void; onExpanderClick: (t: GanttTask) => void;
  }) {
    const nameW = lang === "mn" ? 150 : 130;
    return (
      <div style={{ fontFamily, fontSize }}>
        {tasks.map((t) => (
          <div key={t.id}
            onClick={() => setSelectedTask(t.id)}
            className="border-b border-r border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            style={{ height: rowHeight, display: "flex", alignItems: "center", cursor: "pointer" }}>
            <div className="truncate px-3 font-medium text-slate-700 dark:text-slate-200" style={{ width: nameW }} title={t.name}>{t.name}</div>
            <div className="px-2 text-slate-500 dark:text-slate-400" style={{ width: 200 }}>
              {formatDate(t.start, lang, "medium")} → {formatDate(t.end, lang, "medium")}
            </div>
          </div>
        ))}
      </div>
    );
  };
}

/**
 * Generic timeline. Used for both the portfolio view (one bar per project) and
 * the per-project view (one bar per task). Click a bar to drill in.
 */
export default function GanttChart({
  items,
  onSelect,
  viewMode = ViewMode.Week,
  emptyHint = "Nothing with dates to show yet.",
}: {
  items: GanttItem[];
  onSelect?: (id: string) => void;
  viewMode?: ViewMode;
  emptyHint?: string;
}) {
  const { lang } = useT();
  const wrapRef = useRef<HTMLDivElement>(null);
  const narrow = useIsNarrow();

  const ganttTasks = useMemo<GanttTask[]>(() => {
    return items
      .filter((it) => it.start && it.end)
      .map((it) => {
        const start = new Date(it.start!);
        let end = new Date(it.end!);
        if (end <= start) end = new Date(start.getTime() + 86_400_000);
        return {
          id: it.id,
          name: it.name,
          start,
          end,
          type: "task",
          progress: it.progress,
          isDisabled: !onSelect,
          dependencies: (it.dependencies ?? []).filter((d) => items.some((x) => x.id === d)),
          styles: it.highlight
            ? { backgroundColor: "#fca5a5", progressColor: "#ef4444", backgroundSelectedColor: "#f87171" }
            : { backgroundColor: "#D0E2FD", progressColor: "#1268EB", backgroundSelectedColor: "#A6C8FA" },
        } as GanttTask;
      });
  }, [items, onSelect]);

  // Translate the calendar month labels (SVG <text>) to Mongolian, since the
  // library formats them via Intl which lacks 'mn' here. Re-runs on re-render/scroll.
  useEffect(() => {
    if (lang !== "mn") return;
    const root = wrapRef.current;
    if (!root) return;
    const translate = () => {
      root.querySelectorAll("text").forEach((el) => {
        const txt = el.textContent ?? "";
        const mn = mnCalendarLabel(txt);
        if (mn && mn !== txt) el.textContent = mn;
      });
    };
    translate();
    const obs = new MutationObserver(translate);
    obs.observe(root, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [lang, ganttTasks, viewMode]);

  if (ganttTasks.length === 0) {
    return <div className="card text-sm text-slate-500 dark:text-slate-400">{emptyHint}</div>;
  }

  return (
    <ErrorBoundary fallback="Couldn't render the timeline.">
      <div ref={wrapRef} className="card-table max-h-[360px] overflow-auto p-2 sm:max-h-[460px]">
        <Gantt
          key={`${lang}-${narrow ? "s" : "l"}`}
          tasks={ganttTasks}
          viewMode={viewMode}
          locale={lang === "mn" ? "mn" : "en-US"}
          /* Narrow the name column on phones so the bars stay visible. */
          listCellWidth={narrow ? "150px" : "350px"}
          columnWidth={narrow ? 44 : 62}
          barCornerRadius={4}
          TaskListHeader={makeListHeader(lang)}
          TaskListTable={makeListTable(lang)}
          onClick={(t) => onSelect?.(t.id)}
          onDoubleClick={(t) => onSelect?.(t.id)}
        />
      </div>
    </ErrorBoundary>
  );
}
