import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { PriorityBadge } from "../../components/Badges";
import { useT } from "../../i18n/LanguageContext";
import type { Priority, Requirement, RequirementStatus, RequirementType } from "../../lib/types";

const TYPES: RequirementType[] = ["BUSINESS", "FUNCTIONAL", "NON_FUNCTIONAL"];
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: RequirementStatus[] = ["DRAFT", "BASELINED", "APPROVED", "IMPLEMENTED", "VERIFIED"];

const selectCls =
  "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function Row({ r, projectId, canEdit, canBaseline }: {
  r: Requirement; projectId: string; canEdit: boolean; canBaseline: boolean;
}) {
  const qc = useQueryClient();
  const { t } = useT();
  const key = ["requirements", projectId];
  const patch = useMutation({
    mutationFn: (p: Partial<Requirement>) => api.updateRequirement(r.id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <tr>
      <td className="font-medium text-slate-800 dark:text-slate-100">{r.title}</td>
      <td>{t("reqType." + r.type)}</td>
      <td>
        {canEdit ? (
          <select className={selectCls} value={r.priority} disabled={patch.isPending}
            onChange={(e) => patch.mutate({ priority: e.target.value as Priority })}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{t("prio." + p)}</option>)}
          </select>
        ) : <PriorityBadge value={r.priority} />}
      </td>
      <td>
        {canEdit ? (
          <select className={selectCls} value={r.status} disabled={patch.isPending}
            onChange={(e) => patch.mutate({ status: e.target.value as RequirementStatus })}>
            {STATUSES.map((s) => <option key={s} value={s}>{t("reqStatus." + s)}</option>)}
          </select>
        ) : t("reqStatus." + r.status)}
      </td>
      <td>{r.baseline_version ? `v${r.baseline_version}` : "—"}</td>
      <td className="text-right">
        {canBaseline && r.status !== "BASELINED" && (
          <button className="btn-ghost px-2 py-1 text-xs" disabled={patch.isPending}
            onClick={() => patch.mutate({ status: "BASELINED", baseline_version: 1 })}>
            {t("req.baseline")}
          </button>
        )}
      </td>
    </tr>
  );
}

export default function RequirementsTab({
  projectId, canEdit, canBaseline,
}: { projectId: string; canEdit: boolean; canBaseline: boolean }) {
  const qc = useQueryClient();
  const { t } = useT();
  const key = ["requirements", projectId];
  const { data: items } = useQuery({ queryKey: key, queryFn: () => api.listRequirements(projectId) });

  const [title, setTitle] = useState("");
  const [type, setType] = useState<RequirementType>("FUNCTIONAL");
  const [priority, setPriority] = useState<Priority>("MEDIUM");

  const addMut = useMutation({
    mutationFn: () => api.createRequirement({ project_id: projectId, title, type, priority }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setTitle(""); },
  });

  function add(e: FormEvent) { e.preventDefault(); if (title.trim()) addMut.mutate(); }

  return (
    <div className="space-y-3">
      {canEdit && (
        <form onSubmit={add} className="card grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="label">{t("req.title")}</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Generate monthly invoices" />
          </div>
          <div>
            <label className="label">{t("c.type")}</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as RequirementType)}>
              {TYPES.map((ty) => <option key={ty} value={ty}>{t("reqType." + ty)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("c.priority")}</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t("prio." + p)}</option>)}
            </select>
          </div>
          <div className="md:col-span-4">
            <button className="btn-primary" disabled={addMut.isPending}>{t("req.add")}</button>
          </div>
        </form>
      )}

      <div className="card-table overflow-x-auto">
        <table className="sheet">
          <thead>
            <tr>
              <th className="w-[38%]">{t("req.colTitle")}</th><th>{t("c.type")}</th><th>{t("c.priority")}</th><th>{t("c.status")}</th><th>{t("req.colBaseline")}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((r) => (
              <Row key={r.id} r={r} projectId={projectId} canEdit={canEdit} canBaseline={canBaseline} />
            ))}
            {(items ?? []).length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-400">{t("req.none")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
