import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Avatar } from "../../components/ui";
import { useT } from "../../i18n/LanguageContext";
import { formatDateTime } from "../../i18n/date";

export default function ReportsTab({ projectId }: { projectId: string }) {
  const { t, lang } = useT();
  const { data: updates } = useQuery({
    queryKey: ["task_updates", projectId],
    queryFn: () => api.listTaskUpdates(projectId),
  });
  const { data: tasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => api.listTasks(projectId),
  });

  const taskName = (id: string) => tasks?.find((t) => t.id === id)?.name ?? "task";
  const rows = updates ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("rep.subtitle")}</p>
        <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("rep.entries", { n: rows.length })}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">{t("rep.none")}</div>
      ) : (
        <div className="space-y-3">
          {rows.map((u) => (
            <div key={u.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.user_name} size={30} />
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{u.user_name ?? t("rep.unknown")}</div>
                    <div className="text-[11px] text-slate-400">{formatDateTime(u.created_at, lang)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                    {taskName(u.task_id)}
                  </span>
                  <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {u.progress_before}% → <span className="ml-1 font-bold text-emerald-600">{u.progress_after}%</span>
                  </span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                {u.what_happened && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("rep.what")}</span>
                    <p className="text-slate-700 dark:text-slate-200">{u.what_happened}</p>
                  </div>
                )}
                {u.why_changed && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{t("rep.why")}</span>
                    <p className="border-l-2 border-slate-200 pl-2 italic text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {u.why_changed}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
