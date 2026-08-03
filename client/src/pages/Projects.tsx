import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { isOpen, isAwaitingReview, weightedProgress } from "../lib/types";
import type { Project, Task } from "../lib/types";
import { useAuth, canManageProjects } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Avatar, ProgressBar } from "../components/ui";
import SearchBox from "../components/SearchBox";
import { useT } from "../i18n/LanguageContext";
import { formatDate } from "../i18n/date";

const today = new Date().toISOString().slice(0, 10);

interface Summary {
  progress: number;
  total: number;
  approved: number;
  overdue: number;
  awaitingReview: number;
}

/**
 * A card in a progress-tracking tool that does not show progress is decoration.
 * Each one answers: how far along, is anything late, and is anything sitting
 * on my desk waiting to be approved.
 */
function ProjectCard({ p, s, managerName }: { p: Project; s: Summary; managerName: string | null }) {
  const { t, lang } = useT();
  const late = s.overdue > 0;

  return (
    <Link
      to={`/projects/${p.id}`}
      className="card group flex flex-col transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-pop"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-base font-bold text-brand dark:bg-brand-900/40">
          {p.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-slate-800 group-hover:text-brand dark:text-slate-100">
            {p.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {p.description || "—"}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t("c.progress")}</span>
          <span className="tabular-nums text-slate-400">
            {t("proj.approvedOf", { done: s.approved, total: s.total })}
          </span>
        </div>
        <ProgressBar value={s.progress} tone={late ? "danger" : "brand"} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("phase." + p.sdlc_phase)}
        </span>
        {s.awaitingReview > 0 && (
          <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            ◷ {t("proj.inReview", { n: s.awaitingReview })}
          </span>
        )}
        {late && (
          <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {s.overdue} {t("dash.late")}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar name={managerName} size={20} />
          <span className="truncate">{managerName ?? t("c.unassigned")}</span>
        </span>
        {p.end_date && (
          <span className={`shrink-0 tabular-nums ${p.end_date < today ? "font-semibold text-rose-600" : ""}`}>
            {formatDate(p.end_date, lang, "medium")}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Projects() {
  const { role, session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useT();
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");

  const { data: projects, isLoading } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const { data: allTasks } = useQuery({ queryKey: ["all_tasks"], queryFn: api.listAllTasks });
  const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: api.listProfiles });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const summaries = useMemo(() => {
    const byProject = new Map<string, Task[]>();
    for (const task of allTasks ?? []) {
      const arr = byProject.get(task.project_id) ?? [];
      arr.push(task);
      byProject.set(task.project_id, arr);
    }
    const out = new Map<string, Summary>();
    for (const p of projects ?? []) {
      const tasks = byProject.get(p.id) ?? [];
      out.set(p.id, {
        progress: weightedProgress(tasks),
        total: tasks.length,
        approved: tasks.filter((x) => x.status === "APPROVED").length,
        overdue: tasks.filter((x) => isOpen(x) && !!x.planned_end && x.planned_end < today).length,
        awaitingReview: tasks.filter(isAwaitingReview).length,
      });
    }
    return out;
  }, [projects, allTasks]);

  const managerName = useMemo(() => {
    const byId = new Map((profiles ?? []).map((x) => [x.id, x.full_name]));
    return (id: string | null) => (id ? byId.get(id) ?? null : null);
  }, [profiles]);

  const shown = (projects ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

  const createMut = useMutation({
    // New projects always begin at the first SDLC phase (REQUIREMENTS = DB default).
    mutationFn: () =>
      api.createProject({
        name,
        description: description || null,
        start_date: start || null,
        end_date: end || null,
        manager_id: session!.user.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setName(""); setDescription(""); setStart(""); setEnd("");
      toast.success(t("proj.created"));
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) createMut.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <SearchBox value={q} onChange={setQ} placeholder={t("proj.search")} clearLabel={t("c.cancel")} />
        </div>
        {canManageProjects(role) && (
          <button className="btn-primary shrink-0" onClick={() => setShowForm((s) => !s)}>
            {showForm ? t("c.cancel") : t("proj.new")}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="label">{t("proj.name")}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="md:col-span-2">
            <label className="label">{t("c.description")}</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("c.startDate")}</label>
            <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("c.endDate")}</label>
            <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? t("proj.creating") : t("proj.createBtn")}
            </button>
            <span className="text-xs text-slate-400">{t("proj.startsAt")}</span>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-500 dark:text-slate-400">{t("c.loading")}</p>
      ) : shown.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <ProjectCard
              key={p.id}
              p={p}
              s={summaries.get(p.id) ?? { progress: 0, total: 0, approved: 0, overdue: 0, awaitingReview: 0 }}
              managerName={managerName(p.manager_id)}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center text-sm text-slate-400">
          {q ? t("proj.noMatch") : t("proj.none")}
        </div>
      )}
    </div>
  );
}
