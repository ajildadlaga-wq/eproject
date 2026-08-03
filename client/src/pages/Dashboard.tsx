import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ViewMode } from "gantt-task-react";
import { api } from "../lib/api";
import { isOpen, weightedProgress } from "../lib/types";
import type { Task } from "../lib/types";
import GanttChart, { GanttItem } from "../components/GanttChart";
import { ProgressBar } from "../components/ui";
import { useT } from "../i18n/LanguageContext";

const TONE: Record<string, string> = {
  slate: "text-slate-800 dark:text-slate-100",
  blue: "text-brand-600",
  red: "text-rose-600",
  orange: "text-amber-600",
};

function Kpi({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="text-xs font-medium leading-snug text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl ${TONE[tone] ?? TONE.slate}`}>
        {value}
      </div>
    </div>
  );
}

const today = new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useT();
  const [q, setQ] = useState("");
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const { data: allTasks } = useQuery({ queryKey: ["all_tasks"], queryFn: api.listAllTasks });
  const { data: allRisks } = useQuery({ queryKey: ["all_risks"], queryFn: api.listAllRisks });

  // Group tasks by project.
  const byProject = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of allTasks ?? []) {
      const arr = m.get(t.project_id) ?? [];
      arr.push(t); m.set(t.project_id, arr);
    }
    return m;
  }, [allTasks]);

  const overdue = (t: Task) => isOpen(t) && !!t.planned_end && t.planned_end < today;

  const matches = (projects ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.trim().toLowerCase()),
  );

  const rows = matches.map((p) => {
    const tasks = byProject.get(p.id) ?? [];
    return {
      project: p,
      progress: weightedProgress(tasks),
      taskCount: tasks.length,
      overdueCount: tasks.filter(overdue).length,
    };
  });

  const ganttItems: GanttItem[] = rows
    .filter((r) => r.project.start_date && r.project.end_date)
    .map((r) => ({
      id: r.project.id,
      name: r.project.name,
      start: r.project.start_date,
      end: r.project.end_date,
      progress: r.progress,
      highlight: r.overdueCount > 0,
    }));

  const totalOverdue = (allTasks ?? []).filter(overdue).length;
  const openHighRisks = (allRisks ?? []).filter(
    (r) => r.status !== "CLOSED" && (r.priority === "HIGH" || r.priority === "CRITICAL"),
  ).length;

  return (
    <div className="space-y-5">
      {/* Finding one project among many is the first thing you come here to
          do, so it gets the top of the page rather than a sentence of prose. */}
      <div className="relative">
        <svg viewBox="0 0 24 24" aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("dash.search")}
          aria-label={t("dash.search")}
          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-11 text-[15px] text-slate-700 shadow-card outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label={t("c.cancel")}
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t("dash.kpiProjects")} value={projects?.length ?? 0} />
        <Kpi label={t("dash.kpiWeighted")} value={`${weightedProgress(allTasks ?? [])}%`} tone="blue" />
        <Kpi label={t("dash.kpiOverdue")} value={totalOverdue} tone="red" />
        <Kpi label={t("dash.kpiRisks")} value={openHighRisks} tone="orange" />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("dash.timeline")}</h2>
        <GanttChart
          items={ganttItems}
          viewMode={ViewMode.Month}
          onSelect={(id) => navigate(`/projects/${id}`)}
          emptyHint={t("dash.emptyGantt")}
        />
      </div>

      <div className="card-table">
        <div className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("dash.projects")}</div>
        <div className="sheet-scroll">
        <table className="sheet">
          <thead>
            <tr>
              <th className="w-[30%]">{t("dash.colProject")}</th><th>{t("dash.colPhase")}</th><th>{t("dash.colTasks")}</th>
              <th className="w-[24%]">{t("c.progress")}</th><th>{t("dash.colOverdue")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.project.id} className="cursor-pointer" onClick={() => navigate(`/projects/${r.project.id}`)}>
                <td className="font-medium text-slate-800 dark:text-slate-100">{r.project.name}</td>
                <td>
                  <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {t("phase." + r.project.sdlc_phase)}
                  </span>
                </td>
                <td>{r.taskCount}</td>
                <td><ProgressBar value={r.progress} tone={r.overdueCount > 0 ? "danger" : "brand"} /></td>
                <td>
                  {r.overdueCount > 0
                    ? <span className="badge bg-rose-100 text-rose-700">{r.overdueCount} {t("dash.late")}</span>
                    : <span className="text-slate-400">—</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">
                {q ? t("proj.noMatch") : t("dash.noProjects")}
              </td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
