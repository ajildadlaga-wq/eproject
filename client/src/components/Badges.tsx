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
  NOT_STARTED: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  BLOCKED: "bg-rose-100 text-rose-700",
  DONE: "bg-emerald-100 text-emerald-700",
};

export function TaskStatusBadge({ value }: { value: TaskStatus }) {
  const { t } = useT();
  return <span className={`badge ${TASK_STATUS_STYLES[value]}`}>{t("tstatus." + value)}</span>;
}
