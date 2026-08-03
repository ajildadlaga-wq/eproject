import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth, canManageProjects } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useT } from "../i18n/LanguageContext";
import { formatDate } from "../i18n/date";

export default function Projects() {
  const { role, session } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { t, lang } = useT();
  const [showForm, setShowForm] = useState(false);

  const { data: projects, isLoading } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">{t("proj.title")}</h1>
          <p className="page-sub">{t("proj.subtitle")}</p>
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
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apollo Billing Platform" />
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
          <div className="md:col-span-2 flex items-center gap-3">
            <button className="btn-primary" disabled={createMut.isPending}>
              {createMut.isPending ? t("proj.creating") : t("proj.createBtn")}
            </button>
            <span className="text-xs text-slate-400">{t("proj.startsAt")}</span>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-500 dark:text-slate-400">{t("c.loading")}</p>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="card group transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-pop"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-base font-bold text-brand dark:bg-brand-900/40">
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {t("phase." + p.sdlc_phase)}
                </span>
              </div>
              <div className="mt-3 font-semibold text-slate-800 group-hover:text-brand dark:text-slate-100">{p.name}</div>
              <div className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{p.description}</div>
              {(p.start_date || p.end_date) && (
                <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {formatDate(p.start_date, lang, "medium")} → {formatDate(p.end_date, lang, "medium")}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 dark:text-slate-400">{t("proj.none")}</p>
      )}
    </div>
  );
}
