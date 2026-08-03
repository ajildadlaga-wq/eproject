import type { Priority, RiskStatus, TaskStatus } from "../lib/types";
import { useT } from "../i18n/LanguageContext";

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-100 text-sky-700",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-rose-100 text-rose-700",
};
const PRIORITY_DOT: Record<Priority, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-sky-500",
  HIGH: "bg-amber-500",
  CRITICAL: "bg-rose-500",
};

export function PriorityBadge({ value }: { value: Priority }) {
  const { t } = useT();
  const v: Priority = value ?? "MEDIUM"; // resilient if a row predates the priority column
  return (
    <span className={`badge ${PRIORITY_STYLES[v]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[v]}`} />
      {t("prio." + v)}
    </span>
  );
}

const RISK_STATUS_STYLES: Record<RiskStatus, string> = {
  OPEN: "bg-rose-50 text-rose-700",
  MITIGATING: "bg-amber-50 text-amber-700",
  CLOSED: "bg-emerald-50 text-emerald-700",
};

export function RiskStatusBadge({ value }: { value: RiskStatus }) {
  const { t } = useT();
  return <span className={`badge ${RISK_STATUS_STYLES[value]}`}>{t("rstatus." + value)}</span>;
}

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  ASSIGNED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
  BLOCKED: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  COMPLETED: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  UNDER_REVIEW: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

/** Only APPROVED gets the tick — nothing else is finished. */
const TASK_STATUS_MARK: Partial<Record<TaskStatus, string>> = {
  UNDER_REVIEW: "◷",
  APPROVED: "✓",
  REJECTED: "↩",
};

export function TaskStatusBadge({ value }: { value: TaskStatus }) {
  const { t } = useT();
  const mark = TASK_STATUS_MARK[value];
  return (
    <span className={`badge ${TASK_STATUS_STYLES[value]}`}>
      {mark && <span aria-hidden="true">{mark}</span>}
      {t("tstatus." + value)}
    </span>
  );
}
