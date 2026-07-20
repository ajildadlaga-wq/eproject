import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth, canWrite, isAdmin } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import SdlcStepper from "../components/SdlcStepper";
import RequirementsTab from "./tabs/RequirementsTab";
import RisksTab from "./tabs/RisksTab";
import TasksTab from "./tabs/TasksTab";
import ReportsTab from "./tabs/ReportsTab";
import TeamTab from "./tabs/TeamTab";

type Tab = "requirements" | "risks" | "tasks" | "reports" | "team";
const TABS: Tab[] = ["requirements", "risks", "tasks", "reports", "team"];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { role, session } = useAuth();
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("tasks");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.getProject(id!),
    enabled: !!id,
  });

  if (isLoading) return <p className="text-slate-500">{t("c.loading")}</p>;
  if (!project) return <p className="text-slate-500">{t("detail.notFound")}</p>;

  // Manager of THIS project (or admin) can manage phase, members, deletes.
  const canManageThis = isAdmin(role) || project.manager_id === session?.user.id;
  const canEditContent = canWrite(role);

  return (
    <div className="space-y-4">
      <div>
        <Link to="/projects" className="text-sm font-medium text-slate-400 hover:text-brand">
          {t("nav.projects")} <span className="mx-1">/</span> <span className="text-slate-600 dark:text-slate-300">{project.name}</span>
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
        {project.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {t("sdlc.label")}: {t("phase." + project.sdlc_phase)}
          </span>
        </div>
      </div>

      <SdlcStepper projectId={project.id} current={project.sdlc_phase} canManage={canManageThis} />

      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-card dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${
              tab === tb ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {t("tab." + tb)}
          </button>
        ))}
      </div>

      {tab === "requirements" && (
        <RequirementsTab projectId={project.id} canEdit={canEditContent} canBaseline={canManageThis} />
      )}
      {tab === "risks" && <RisksTab projectId={project.id} canEdit={canEditContent} />}
      {tab === "tasks" && <TasksTab projectId={project.id} canEdit={canEditContent} />}
      {tab === "reports" && <ReportsTab projectId={project.id} />}
      {tab === "team" && <TeamTab projectId={project.id} canManage={canManageThis} />}
    </div>
  );
}
