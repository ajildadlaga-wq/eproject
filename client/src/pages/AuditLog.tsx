import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { AUDIT_ACTIONS } from "../lib/types";
import type { AuditEntry } from "../lib/types";
import { Avatar } from "../components/ui";
import { useT } from "../i18n/LanguageContext";
import { formatDateTime } from "../i18n/date";

/**
 * The audit trail, read-only.
 *
 * The database grants no write on this table to anyone signed in — rows arrive
 * only from SECURITY DEFINER functions. So this page offers no way to add or
 * remove a line, and that absence is the feature: a log you can edit proves
 * nothing.
 */

const TONE: Record<string, { pill: string; dot: string }> = {
  TASK_APPROVED: { pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", dot: "bg-emerald-500" },
  TASK_REJECTED: { pill: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", dot: "bg-rose-500" },
  TASK_SUBMITTED: { pill: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300", dot: "bg-amber-500" },
  ROLE_CHANGED: { pill: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200", dot: "bg-brand-500" },
  PROJECT_REASSIGNED: { pill: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200", dot: "bg-brand-500" },
};
const fallback = { pill: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-400" };

/** Render the jsonb payload as the sentence it stands for. */
function detailText(e: AuditEntry): string | null {
  const d = e.detail;
  if (!d) return null;
  if (typeof d.reason === "string" && d.reason) return d.reason;
  if (typeof d.note === "string" && d.note) return d.note;
  if (d.from != null && d.to != null) return `${d.from} → ${d.to}`;
  return null;
}

export default function AuditLog() {
  const { t, lang } = useT();
  const [action, setAction] = useState("");
  const [projectId, setProjectId] = useState("");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["audit_log", action, projectId],
    queryFn: () => api.listAuditLog({ action: action || undefined, projectId: projectId || undefined }),
  });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });

  const projectName = useMemo(() => {
    const byId = new Map((projects ?? []).map((p) => [p.id, p.name]));
    return (id: string | null) => (id ? byId.get(id) ?? null : null);
  }, [projects]);

  const rows = entries ?? [];
  const selectCls =
    "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">{t("audit.allActions")}</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>{t("audit." + a)}</option>
          ))}
        </select>
        <select className={selectCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">{t("audit.allProjects")}</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {(action || projectId) && (
          <button className="btn-ghost" onClick={() => { setAction(""); setProjectId(""); }}>
            {t("audit.clear")}
          </button>
        )}
        <span className="ml-auto badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("rep.entries", { n: rows.length })}
        </span>
      </div>

      <p className="page-sub">{t("audit.readOnly")}</p>

      {isLoading ? (
        <p className="text-slate-500 dark:text-slate-400">{t("c.loading")}</p>
      ) : rows.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">{t("audit.none")}</div>
      ) : (
        <div className="card-table">
          <div className="sheet-scroll">
            <table className="sheet">
              <thead>
                <tr>
                  <th className="w-[17%]">{t("audit.when")}</th>
                  <th className="w-[20%]">{t("audit.who")}</th>
                  <th className="w-[18%]">{t("audit.what")}</th>
                  <th>{t("audit.detail")}</th>
                  <th className="w-[16%]">{t("dash.colProject")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const tone = TONE[e.action] ?? fallback;
                  const extra = detailText(e);
                  return (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap tabular-nums text-slate-500">
                        {formatDateTime(e.occurred_at, lang)}
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <Avatar name={e.actor_name} size={24} />
                          <span className="min-w-0">
                            <span className="block truncate text-slate-700 dark:text-slate-200">
                              {e.actor_name ?? t("rep.unknown")}
                            </span>
                            {e.actor_role && (
                              <span className="block text-[11px] text-slate-400">
                                {t("role." + e.actor_role)}
                              </span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${tone.pill}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                          {t("audit." + e.action)}
                        </span>
                      </td>
                      <td>
                        <span className="block text-slate-600 dark:text-slate-300">{e.summary ?? "—"}</span>
                        {extra && (
                          <span className="mt-0.5 block text-xs text-slate-400">↩ {extra}</span>
                        )}
                      </td>
                      <td className="text-slate-500">{projectName(e.project_id) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
