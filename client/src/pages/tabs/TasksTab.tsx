import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Avatar, ProgressBar } from "../../components/ui";
import { PriorityBadge, TaskStatusBadge } from "../../components/Badges";
import GanttChart, { GanttItem } from "../../components/GanttChart";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { useAuth, canApprove } from "../../context/AuthContext";
import { useT } from "../../i18n/LanguageContext";
import { formatDate, formatDateTime } from "../../i18n/date";
import { ASSIGNABLE_STATUSES, isOpen } from "../../lib/types";
import type { Priority, Task, TaskStatus } from "../../lib/types";

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

// Ordered by what needs attention: work waiting on the manager sits at the top,
// finished work at the bottom.
const GROUPS: { status: TaskStatus; pill: string; dot: string }[] = [
  { status: "UNDER_REVIEW", pill: "bg-amber-50 text-amber-800",    dot: "bg-amber-500" },
  { status: "REJECTED",     pill: "bg-rose-50 text-rose-700",      dot: "bg-rose-500" },
  { status: "IN_PROGRESS",  pill: "bg-brand-50 text-brand-700",    dot: "bg-brand-500" },
  { status: "BLOCKED",      pill: "bg-rose-50 text-rose-700",      dot: "bg-rose-500" },
  { status: "ASSIGNED",     pill: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
  { status: "DRAFT",        pill: "bg-slate-100 text-slate-500",   dot: "bg-slate-300" },
  { status: "APPROVED",     pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
];

const selectCls =
  "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300";

const todayStr = new Date().toISOString().slice(0, 10);
const isOverdue = (t: Task) => isOpen(t) && !!t.planned_end && t.planned_end < todayStr;

/** An ISO date shifted by whole days. */
function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const dayAfter = (iso: string) => addDays(iso, 1);


/**
 * Which tasks would form a loop if this one waited for them.
 *
 * Anything that already waits for `taskId`, at any remove, cannot also be
 * waited on by it. Offering those as options and refusing them on save would
 * be a small cruelty, so they are left out of the list.
 */
function wouldLoop(taskId: string | undefined, all: Task[]): Set<string> {
  const out = new Set<string>();
  if (!taskId) return out;
  const queue = [taskId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const other of all) {
      if (out.has(other.id)) continue;
      if ((other.depends_on ?? []).includes(current)) {
        out.add(other.id);
        queue.push(other.id);
      }
    }
  }
  return out;
}

// ---- Create / edit dialog -------------------------------------------------
function TaskDialog({ projectId, task, allTasks, onClose }: {
  projectId: string; task: Task | null; allTasks: Task[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t, lang } = useT();
  const { data: members } = useQuery({ queryKey: ["members", projectId], queryFn: () => api.listMembers(projectId) });
  const { data: project } = useQuery({ queryKey: ["project", projectId], queryFn: () => api.getProject(projectId) });

  const [name, setName] = useState(task?.name ?? "");
  const [plannedStart, setPlannedStart] = useState(task?.planned_start ?? "");
  const [plannedEnd, setPlannedEnd] = useState(task?.planned_end ?? "");
  const [percent, setPercent] = useState(task?.percent_complete ?? 0);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "DRAFT");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "MEDIUM");
  const [assignee, setAssignee] = useState(task?.assignee_id ?? "");
  const [deps, setDeps] = useState<string[]>(task?.depends_on ?? []);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        project_id: projectId, name,
        planned_start: plannedStart || null, planned_end: plannedEnd || null,
        percent_complete: percent, status, priority,
        assignee_id: assignee || null, depends_on: deps,
      };
      return task ? api.updateTask(task.id, payload) : api.createTask(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", projectId] }); toast.success(task ? t("task.updated") : t("task.createdMsg")); onClose(); },
    onError: (e) => toast.error((e as Error).message),
  });

  function submit(e: FormEvent) { e.preventDefault(); if (name.trim() && !problem) save.mutate(); }

  // A task cannot wait for itself, nor for anything already waiting on it.
  const looping = useMemo(() => wouldLoop(task?.id, allTasks), [task?.id, allTasks]);
  const candidateDeps = allTasks.filter((x) => x.id !== task?.id && !looping.has(x.id));

  // The latest thing this task waits for sets the earliest it can begin.
  const blocker = useMemo(() => {
    const chosen = allTasks.filter((x) => deps.includes(x.id) && x.planned_end);
    if (chosen.length === 0) return null;
    return chosen.reduce((a, b) => (a.planned_end! >= b.planned_end! ? a : b));
  }, [deps, allTasks]);

  // The first day this task is free to begin, given what it waits for.
  const earliest = blocker?.planned_end ? dayAfter(blocker.planned_end) : null;

  // Every bound the date pickers should respect, in one place. The inputs get
  // them as min/max, so most mistakes never become possible in the first
  // place; the database still checks, because a form is only a courtesy.
  const minStart = [project?.start_date ?? null, earliest]
    .filter(Boolean).sort().pop() ?? undefined;

  const maxDate = project?.end_date ?? undefined;
  const minEnd = [plannedStart || null, minStart ?? null].filter(Boolean).sort().pop() ?? undefined;

  // What is wrong right now, said as a sentence. Null means nothing is.
  const problem: string | null = (() => {
    if (plannedStart && plannedEnd && plannedEnd < plannedStart) return t("task.errEndsFirst");
    if (project?.start_date && plannedStart && plannedStart < project.start_date)
      return t("task.errBeforeProject", { date: formatDate(project.start_date, lang) });
    if (project?.end_date && plannedEnd && plannedEnd > project.end_date)
      return t("task.errAfterProject", { date: formatDate(project.end_date, lang) });
    if (blocker?.planned_end && plannedStart && plannedStart <= blocker.planned_end)
      return t("task.errBeforeBlocker", {
        name: blocker.name,
        date: formatDate(dayAfter(blocker.planned_end), lang),
      });
    return null;
  })();

  return (
    <Modal title={task ? t("task.edit") : t("task.new")} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-6"><label className="label">{t("task.colTask")}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Core development" autoFocus /></div>
        <div className="md:col-span-3"><label className="label">{t("task.plannedStart")}</label>
          <input className="input" type="date" value={plannedStart ?? ""} min={minStart} max={maxDate}
            onChange={(e) => setPlannedStart(e.target.value)} /></div>
        <div className="md:col-span-3"><label className="label">{t("task.plannedEnd")}</label>
          <input className="input" type="date" value={plannedEnd ?? ""} min={minEnd} max={maxDate}
            onChange={(e) => setPlannedEnd(e.target.value)} /></div>

        {/* Say what the limits are, rather than leaving greyed-out days to
            be puzzled over. */}
        <div className="md:col-span-6 -mt-1 space-y-1">
          {project?.start_date && project?.end_date && (
            <p className="text-xs text-slate-400">
              {t("task.windowHint", {
                from: formatDate(project.start_date, lang),
                to: formatDate(project.end_date, lang),
              })}
            </p>
          )}
          {blocker?.planned_end && earliest && (
            <p className="text-xs text-slate-400">
              {t("task.blockerHint", {
                name: blocker.name,
                end: formatDate(blocker.planned_end, lang),
                date: formatDate(earliest, lang),
              })}
            </p>
          )}
          {problem && <p className="text-xs font-medium text-rose-600">{problem}</p>}
        </div>
        <div className="md:col-span-2"><label className="label">{t("c.priority")}</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{t("prio." + p)}</option>)}
          </select></div>
        <div className="md:col-span-2"><label className="label">{t("task.percent")}</label>
          <input className="input" type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value))} /></div>
        <div className="md:col-span-2"><label className="label">{t("c.status")}</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {ASSIGNABLE_STATUSES.map((s) => <option key={s} value={s}>{t("tstatus." + s)}</option>)}
          </select></div>
        <div className="md:col-span-6"><label className="label">{t("c.assignee")}</label>
          <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">{t("team.selectUser")}</option>
            {(members ?? []).map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.profile?.full_name ?? m.user_id} ({m.member_role})</option>
            ))}
          </select></div>
        {candidateDeps.length > 0 && (
          <div className="md:col-span-6">
            <label className="label">{t("task.dependsOn")}</label>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              {candidateDeps.map((d) => (
                <label key={d.id} className="flex items-center gap-2 py-0.5 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={deps.includes(d.id)}
                    onChange={(e) => setDeps((cur) => e.target.checked ? [...cur, d.id] : cur.filter((x) => x !== d.id))} />
                  {d.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="md:col-span-6 mt-1 flex items-center gap-2">
          <button className="btn-primary" disabled={save.isPending || !!problem}>
            {save.isPending ? t("c.saving") : t("task.saveBtn")}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>{t("c.cancel")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Progress update dialog (audit) ---------------------------------------
function ProgressDialog({ projectId, task, requireReport, onClose }: {
  projectId: string; task: Task; requireReport: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useT();
  const [progress, setProgress] = useState(task.percent_complete);
  // What is actually in the number box. Kept apart from `progress` so that a
  // half-typed or nonsense entry can be shown back to the person with a
  // reason, instead of being silently rounded into something they did not ask
  // for.
  const [typed, setTyped] = useState(String(task.percent_complete));
  const [numErr, setNumErr] = useState("");
  const [what, setWhat] = useState("");
  const [why, setWhy] = useState("");
  const [err, setErr] = useState("");

  const done = progress === 100;

  function setBoth(n: number) {
    setProgress(n);
    setTyped(String(n));
    setNumErr("");
  }

  // Only whole numbers from 0 to 100. Anything else is refused here and
  // again in the database, which is the copy that matters.
  function onTyped(v: string) {
    setTyped(v);
    if (v.trim() === "") { setNumErr(t("task.progressRange")); return; }
    if (!/^\d+$/.test(v.trim())) { setNumErr(t("task.progressWhole")); return; }
    const n = Number(v);
    if (n < 0 || n > 100) { setNumErr(t("task.progressRange")); return; }
    setNumErr("");
    setProgress(n);
  }

  // Reaching 100 is a claim that the work is finished, so the database sends
  // the task to the manager. Approval remains the manager's alone.
  const save = useMutation({
    mutationFn: () => {
      const status: TaskStatus | undefined = progress > 0 && progress < 100 ? "IN_PROGRESS" : undefined;
      return api.updateTaskProgress({ taskId: task.id, progress, status, what: what || undefined, why: why || undefined });
    },
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["task_updates", projectId] });
      qc.invalidateQueries({ queryKey: ["all_tasks"] });
      toast.success(status === "UNDER_REVIEW" ? t("review.submitted") : t("task.progressUpdated"));
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (numErr) return;
    if (requireReport && (!what.trim() || !why.trim())) {
      setErr(t("task.auditRequired"));
      return;
    }
    save.mutate();
  }

  return (
    <Modal title={`${t("task.updateTitle")} — ${task.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className={`rounded-xl border p-4 transition-colors ${
          done ? "border-accent/40 bg-accent-light/50 dark:border-accent/30 dark:bg-accent/5"
               : "border-slate-200 dark:border-slate-800"}`}>
          <div className="mb-3 flex items-end justify-between gap-3">
            <span className="text-sm text-slate-500">{t("c.progress")}</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" inputMode="numeric" min={0} max={100} step={1} value={typed}
                onChange={(e) => onTyped(e.target.value)}
                aria-label={t("c.progress")}
                className={`w-20 rounded-lg border bg-white px-2 py-1 text-right text-lg font-bold tabular-nums outline-none focus:ring-2 dark:bg-slate-900 ${
                  numErr
                    ? "border-rose-400 text-rose-600 focus:ring-rose-500/20"
                    : done
                      ? "border-accent/50 text-accent-dark focus:ring-accent/20"
                      : "border-slate-200 text-brand focus:ring-brand/20 dark:border-slate-700"}`}
              />
              <span className={`text-lg font-bold ${done ? "text-accent-dark" : "text-brand"}`}>%</span>
            </div>
          </div>

          <input
            type="range" min={0} max={100} step={1} value={progress}
            onChange={(e) => setBoth(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: done ? "#22A15C" : "#1268EB" }}
          />

          {numErr ? (
            <p className="mt-2 text-xs font-medium text-rose-600">{numErr}</p>
          ) : done ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-accent-dark">
              <svg viewBox="0 0 24 24" className="mt-px h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor"
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
              {t("task.hundredSubmits")}
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-400">{t("review.onlyApprovedCounts")}</p>
          )}
        </div>
        <div><label className="label">{t("task.whatChanged")}{requireReport && " *"}</label>
          <input className="input" value={what} onChange={(e) => setWhat(e.target.value)} /></div>
        <div><label className="label">{t("task.why")}{requireReport && " *"}</label>
          <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} /></div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <div className="flex items-center gap-2">
          <button className="btn-primary" disabled={save.isPending || !!numErr}>
            {save.isPending ? t("c.saving") : done ? t("task.sendForReview") : t("task.submit")}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>{t("c.cancel")}</button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Review dialog (manager approves or sends work back) ------------------
function ReviewDialog({ projectId, task, onClose }: {
  projectId: string; task: Task; onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useT();
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");

  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    qc.invalidateQueries({ queryKey: ["all_tasks"] });
    toast.success(msg);
    onClose();
  };

  const approve = useMutation({
    mutationFn: () => api.approveTask(task.id, note || undefined),
    onSuccess: () => done(t("review.approved")),
    onError: (e) => toast.error((e as Error).message),
  });

  // A rejection without a reason leaves the assignee guessing, so the
  // database rejects it too — this check just gives a friendlier message.
  const reject = useMutation({
    mutationFn: () => api.rejectTask(task.id, note),
    onSuccess: () => done(t("review.rejected")),
    onError: (e) => toast.error((e as Error).message),
  });

  const busy = approve.isPending || reject.isPending;

  return (
    <Modal title={task.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-500">{t("c.assignee")}</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {task.assignee?.full_name ?? t("c.unassigned")}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">{t("review.onlyApprovedCounts")}</p>
        </div>

        {/* Approving is a statement that you inspected the work. What the
            assignee reported along the way is the nearest thing to evidence
            this screen can offer, so it is here rather than a tab away. */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800">
            {t("task.history")}
          </p>
          <TaskHistory taskId={task.id} />
        </div>

        <div>
          <label className="label">{t("review.note")}</label>
          <textarea
            className="input min-h-[84px]"
            value={note}
            onChange={(e) => { setNote(e.target.value); setErr(""); }}
            placeholder={t("review.reasonHint")}
          />
          <p className="mt-1 text-xs text-slate-400">{t("review.reasonHint")}</p>
        </div>

        {err && <p className="text-sm text-rose-600">{err}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
            disabled={busy}
            onClick={() => approve.mutate()}
          >
            {t("review.approve")}
          </button>
          <button
            className="btn border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:bg-slate-900"
            disabled={busy}
            onClick={() => {
              if (!note.trim()) { setErr(t("review.reasonRequired")); return; }
              reject.mutate();
            }}
          >
            {t("review.reject")}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>{t("c.cancel")}</button>
        </div>
      </div>
    </Modal>
  );
}

// ---- One task's history ---------------------------------------------------
/**
 * Every progress report on a single task, newest first.
 *
 * Sized to sit inside a table row rather than take over the screen: this is
 * something you glance at while deciding whether to approve, not a page you
 * visit. The project-wide version lives on the History tab.
 */
function TaskHistory({ taskId }: { taskId: string }) {
  const { t, lang } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["task_history", taskId],
    queryFn: () => api.listTaskHistory(taskId),
  });

  if (isLoading) return <p className="px-4 py-3 text-xs text-slate-400">{t("c.loading")}</p>;
  const rows = data ?? [];
  if (rows.length === 0) return <p className="px-4 py-3 text-xs text-slate-400">{t("task.noHistory")}</p>;

  return (
    <ol className="max-h-56 space-y-0 overflow-y-auto px-4 py-1">
      {rows.map((u, i) => (
        <li key={u.id} className="flex gap-3 py-2">
          {/* A spine down the left, so the entries read as one sequence. */}
          <div className="flex flex-col items-center">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
            {i < rows.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {u.user_name ?? t("rep.unknown")}
              </span>
              <span className="tabular-nums text-xs font-semibold text-brand">
                {u.progress_before ?? 0}% → {u.progress_after ?? 0}%
              </span>
              <span className="ml-auto whitespace-nowrap text-[11px] text-slate-400">
                {formatDateTime(u.created_at, lang)}
              </span>
            </div>
            {u.what_happened && (
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{u.what_happened}</p>
            )}
            {u.why_changed && (
              <p className="mt-0.5 text-xs italic text-slate-400">{u.why_changed}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---- Row ------------------------------------------------------------------
function Row({ t, projectId, canManage, canReview, userId, onEdit, onProgress, onReview }: {
  t: Task; projectId: string; canManage: boolean; canReview: boolean;
  userId: string | undefined;
  onEdit: (t: Task) => void; onProgress: (t: Task) => void; onReview: (t: Task) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t: tr, lang } = useT();
  const overdue = isOverdue(t);
  const [showHistory, setShowHistory] = useState(false);

  const inReview = t.status === "UNDER_REVIEW";
  const approved = t.status === "APPROVED";
  const locked = inReview || approved;          // nothing to edit once it has left the assignee

  // Reporting belongs to the person doing the work. The manager keeps it for
  // work nobody has been given yet — unassigned is still theirs to account for.
  const mine = !!userId && (t.assignee_id === userId || (t.assignee_id === null && canManage));
  const canSubmit = mine && ["IN_PROGRESS", "BLOCKED", "REJECTED"].includes(t.status);

  const patch = useMutation({
    mutationFn: (p: Partial<Task>) => api.updateTask(t.id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", projectId] }),
    onError: (e) => toast.error((e as Error).message),
  });
  const submit = useMutation({
    mutationFn: () => api.submitTask(t.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      toast.success(tr("review.submitted"));
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const del = useMutation({
    mutationFn: () => api.deleteTask(t.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", projectId] }); toast.success(tr("task.deleted")); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
    <tr>
      <td className="font-medium text-slate-800 dark:text-slate-100">
        {t.name}
        {/* The reason a task came back is the one thing the assignee must read. */}
        {t.status === "REJECTED" && t.review_note && (
          <p className="mt-1 max-w-[38ch] text-xs font-normal text-rose-600 dark:text-rose-400">
            ↩ {t.review_note}
          </p>
        )}
        {inReview && (
          <p className="mt-1 text-xs font-normal text-amber-700 dark:text-amber-400">
            {tr("review.awaiting")}
          </p>
        )}
      </td>
      <td>
        {t.assignee?.full_name
          ? <span className="flex items-center gap-2"><Avatar name={t.assignee.full_name} size={24} /><span className="text-slate-500">{t.assignee.full_name}</span></span>
          : <span className="text-slate-400">{tr("c.unassigned")}</span>}
      </td>
      <td><PriorityBadge value={t.priority} /></td>
      <td><span className={overdue ? "font-semibold text-rose-600" : "text-slate-500"}>{formatDate(t.planned_end, lang, "medium")}</span></td>
      <td className="w-[16%]"><ProgressBar value={t.percent_complete} tone={overdue ? "danger" : "brand"} /></td>
      <td>
        {/* Once submitted, the status is the review process's to change. */}
        {canManage && !locked ? (
          <select className={selectCls} value={t.status} disabled={patch.isPending}
            onChange={(e) => patch.mutate({ status: e.target.value as TaskStatus })}>
            {ASSIGNABLE_STATUSES.map((s) => <option key={s} value={s}>{tr("tstatus." + s)}</option>)}
            {t.status === "REJECTED" && <option value="REJECTED">{tr("tstatus.REJECTED")}</option>}
          </select>
        ) : <TaskStatusBadge value={t.status} />}
      </td>
      <td className="whitespace-nowrap text-right">
        {canReview && inReview && (
          <button className="btn mr-1 bg-accent px-2.5 py-1 text-xs text-white hover:bg-accent-dark"
            onClick={() => onReview(t)}>{tr("review.reviewBtn")}</button>
        )}
        {canSubmit && (
          <button className="btn mr-1 border border-accent/40 bg-accent-light px-2.5 py-1 text-xs font-semibold text-accent-dark hover:bg-accent/20 disabled:opacity-50"
            disabled={submit.isPending}
            onClick={() => submit.mutate()}>{tr("review.submit")}</button>
        )}
        {mine && !locked && <button className="btn-ghost mr-1 px-2 py-1 text-xs" onClick={() => onProgress(t)}>{tr("c.update")}</button>}
        {canManage && !approved && <button className="btn-ghost mr-1 px-2 py-1 text-xs" onClick={() => onEdit(t)}>{tr("c.edit")}</button>}
        {canManage && (
          <button className="btn-ghost px-2 py-1 text-xs text-rose-600" disabled={del.isPending}
            onClick={() => { if (confirm(`${tr("task.deleteConfirm")} "${t.name}"?`)) del.mutate(); }}>{tr("c.delete")}</button>
        )}

        {/* The history is one click away and stays out of the way until asked
            for. A manager about to approve wants it; everyone else is reading
            a list of tasks. */}
        <button
          type="button"
          aria-expanded={showHistory}
          title={tr("task.history")}
          onClick={() => setShowHistory((s) => !s)}
          className={`btn-ghost ml-1 px-1.5 py-1 ${showHistory ? "text-brand" : "text-slate-400"}`}
        >
          <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 1.8" />
          </svg>
        </button>
      </td>
    </tr>

    {showHistory && (
      <tr>
        <td colSpan={7} className="bg-slate-50/70 p-0 dark:bg-slate-900/50">
          <div className="border-l-2 border-brand/40">
            <TaskHistory taskId={t.id} />
          </div>
        </td>
      </tr>
    )}
    </>
  );
}

// ---- Tab ------------------------------------------------------------------
export default function TasksTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const { role, session } = useAuth();
  const { t } = useT();
  // Approving is the manager's of *this* project, not of any project.
  const canReview = canApprove(role) && canManage;
  const requireReport = role === "TEAM_MEMBER";
  const userId = session?.user.id;
  const { data: items } = useQuery({ queryKey: ["tasks", projectId], queryFn: () => api.listTasks(projectId) });
  const [dialog, setDialog] = useState<Task | "new" | null>(null);
  const [progressTask, setProgressTask] = useState<Task | null>(null);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [view, setView] = useState<"table" | "gantt">("table");
  const [q, setQ] = useState("");

  const tasks = items ?? [];
  const filtered = useMemo(
    () => tasks.filter((t) => t.name.toLowerCase().includes(q.toLowerCase())),
    [tasks, q],
  );

  const ganttItems: GanttItem[] = filtered.map((t) => ({
    id: t.id, name: t.name, start: t.planned_start, end: t.planned_end,
    progress: t.percent_complete, highlight: isOverdue(t), dependencies: t.depends_on,
  }));

  const pending = tasks.filter((t) => t.status === "UNDER_REVIEW");

  return (
    <div className="space-y-4">
      {/* The manager's queue. Work sitting here counts for nothing until it
          is approved, so surfacing it is the point of the whole screen. */}
      {canReview && pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-l-4 border-amber-400 border-y border-r border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:border-l-amber-500 dark:bg-amber-950/20">
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {t("review.pending")} · {pending.length}
          </span>
          <span className="text-xs text-amber-800/80 dark:text-amber-300/80">
            {t("review.onlyApprovedCounts")}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input className="input max-w-[200px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("task.search")} />
          <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            {(["table", "gantt"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize ${
                  view === v ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                {t(v === "table" ? "task.viewTable" : "task.viewGantt")}
              </button>
            ))}
          </div>
        </div>
        {canManage && <button className="btn-primary" onClick={() => setDialog("new")}>{t("task.add")}</button>}
      </div>

      {view === "gantt" ? (
        <GanttChart
          items={ganttItems}
          onSelect={(id) => {
            const tk = tasks.find((x) => x.id === id);
            if (!tk) return;
            if (canManage) setDialog(tk);
            else if (tk.assignee_id === userId) setProgressTask(tk);
          }}
          emptyHint={t("task.emptyGantt")} />
      ) : filtered.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">{t("task.noMatch")}</div>
      ) : (
        <div className="space-y-5">
          {GROUPS.map((g) => {
            const rows = filtered.filter((t) => t.status === g.status);
            if (rows.length === 0) return null;
            return (
              <div key={g.status} className="card-table">
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className={`badge ${g.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${g.dot}`} />{t("tstatus." + g.status)}</span>
                  <span className="text-xs font-medium text-slate-400">{rows.length}</span>
                </div>
                <table className="sheet">
                  <thead>
                    <tr>
                      <th className="w-[24%]">{t("task.colTask")}</th><th>{t("c.assignee")}</th><th>{t("c.priority")}</th><th>{t("c.due")}</th>
                      <th className="w-[16%]">{t("c.progress")}</th><th>{t("c.status")}</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <Row key={t.id} t={t} projectId={projectId} canManage={canManage}
                        canReview={canReview} userId={userId}
                        onEdit={setDialog} onProgress={setProgressTask} onReview={setReviewTask} />
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {dialog && (
        <TaskDialog projectId={projectId} task={dialog === "new" ? null : dialog} allTasks={tasks} onClose={() => setDialog(null)} />
      )}
      {progressTask && (
        <ProgressDialog projectId={projectId} task={progressTask} requireReport={requireReport}
          onClose={() => setProgressTask(null)} />
      )}
      {reviewTask && (
        <ReviewDialog projectId={projectId} task={reviewTask} onClose={() => setReviewTask(null)} />
      )}
    </div>
  );
}
