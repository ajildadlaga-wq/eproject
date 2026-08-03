import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Avatar, ProgressBar } from "../../components/ui";
import { PriorityBadge, TaskStatusBadge } from "../../components/Badges";
import GanttChart, { GanttItem } from "../../components/GanttChart";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { useAuth, canApprove, canManageProjects } from "../../context/AuthContext";
import { useT } from "../../i18n/LanguageContext";
import { formatDate } from "../../i18n/date";
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

// ---- Create / edit dialog -------------------------------------------------
function TaskDialog({ projectId, task, allTasks, onClose }: {
  projectId: string; task: Task | null; allTasks: Task[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useT();
  const { data: members } = useQuery({ queryKey: ["members", projectId], queryFn: () => api.listMembers(projectId) });

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

  function submit(e: FormEvent) { e.preventDefault(); if (name.trim()) save.mutate(); }

  const candidateDeps = allTasks.filter((x) => x.id !== task?.id);

  return (
    <Modal title={task ? t("task.edit") : t("task.new")} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-6"><label className="label">{t("task.colTask")}</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Core development" autoFocus /></div>
        <div className="md:col-span-3"><label className="label">{t("task.plannedStart")}</label>
          <input className="input" type="date" value={plannedStart ?? ""} onChange={(e) => setPlannedStart(e.target.value)} /></div>
        <div className="md:col-span-3"><label className="label">{t("task.plannedEnd")}</label>
          <input className="input" type="date" value={plannedEnd ?? ""} onChange={(e) => setPlannedEnd(e.target.value)} /></div>
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
          <button className="btn-primary" disabled={save.isPending}>{save.isPending ? t("c.saving") : t("task.saveBtn")}</button>
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
  const [what, setWhat] = useState("");
  const [why, setWhy] = useState("");
  const [err, setErr] = useState("");

  // Progress stops at 99%. Declaring the work finished is a separate act —
  // "Submit for review" — and only the manager can close it out from there.
  const save = useMutation({
    mutationFn: () => {
      const status: TaskStatus = progress > 0 ? "IN_PROGRESS" : task.status;
      return api.updateTaskProgress({ taskId: task.id, progress, status, what: what || undefined, why: why || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["task_updates", projectId] });
      toast.success(t("task.progressUpdated")); onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (requireReport && (!what.trim() || !why.trim())) {
      setErr(t("task.auditRequired"));
      return;
    }
    save.mutate();
  }

  return (
    <Modal title={`${t("task.updateTitle")} — ${task.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-500">{t("c.progress")}</span><span className="font-bold text-brand">{progress}%</span>
          </div>
          <input type="range" min={0} max={99} step={1} value={progress}
            onChange={(e) => setProgress(Number(e.target.value))} className="w-full" style={{ accentColor: "#1268EB" }} />
          <p className="mt-2 text-xs text-slate-400">{t("review.onlyApprovedCounts")}</p>
        </div>
        <div><label className="label">{t("task.whatChanged")}{requireReport && " *"}</label>
          <input className="input" value={what} onChange={(e) => setWhat(e.target.value)} /></div>
        <div><label className="label">{t("task.why")}{requireReport && " *"}</label>
          <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} /></div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <div className="flex items-center gap-2">
          <button className="btn-primary" disabled={save.isPending}>{save.isPending ? t("c.saving") : t("task.submit")}</button>
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

// ---- Row ------------------------------------------------------------------
function Row({ t, projectId, canEdit, canDelete, canReview, userId, onEdit, onProgress, onReview }: {
  t: Task; projectId: string; canEdit: boolean; canDelete: boolean; canReview: boolean;
  userId: string | undefined;
  onEdit: (t: Task) => void; onProgress: (t: Task) => void; onReview: (t: Task) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t: tr, lang } = useT();
  const overdue = isOverdue(t);

  const inReview = t.status === "UNDER_REVIEW";
  const approved = t.status === "APPROVED";
  const locked = inReview || approved;          // nothing to edit once it has left the assignee
  const mine = !!userId && t.assignee_id === userId;
  const canSubmit = canEdit && mine && ["IN_PROGRESS", "BLOCKED", "REJECTED"].includes(t.status);

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
        {canEdit && !locked ? (
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
        {canEdit && !locked && <button className="btn-ghost mr-1 px-2 py-1 text-xs" onClick={() => onProgress(t)}>{tr("c.update")}</button>}
        {canEdit && !approved && <button className="btn-ghost mr-1 px-2 py-1 text-xs" onClick={() => onEdit(t)}>{tr("c.edit")}</button>}
        {canDelete && (
          <button className="btn-ghost px-2 py-1 text-xs text-rose-600" disabled={del.isPending}
            onClick={() => { if (confirm(`${tr("task.deleteConfirm")} "${t.name}"?`)) del.mutate(); }}>{tr("c.delete")}</button>
        )}
      </td>
    </tr>
  );
}

// ---- Tab ------------------------------------------------------------------
export default function TasksTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { role, session } = useAuth();
  const { t } = useT();
  const canDelete = canManageProjects(role);
  const canReview = canApprove(role);
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
        {canEdit && <button className="btn-primary" onClick={() => setDialog("new")}>{t("task.add")}</button>}
      </div>

      {view === "gantt" ? (
        <GanttChart items={ganttItems} onSelect={(id) => { const tk = tasks.find((x) => x.id === id); if (tk) canEdit ? setDialog(tk) : setProgressTask(tk); }}
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
                      <Row key={t.id} t={t} projectId={projectId} canEdit={canEdit} canDelete={canDelete}
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
