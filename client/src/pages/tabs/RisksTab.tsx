import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { PriorityBadge, RiskStatusBadge } from "../../components/Badges";
import { useAuth, canManageProjects } from "../../context/AuthContext";
import { useT } from "../../i18n/LanguageContext";
import type { Priority, Risk, RiskCategory, RiskStatus } from "../../lib/types";

const CATEGORIES: RiskCategory[] = ["TECHNICAL", "SCHEDULE", "COST", "RESOURCE", "SCOPE", "EXTERNAL"];
const RISK_STATUSES: RiskStatus[] = ["OPEN", "MITIGATING", "CLOSED"];

const selectCls =
  "rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
const numCls =
  "w-14 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

// Mirror of the DB generated column / Edge Function banding, for a live preview.
function band(p: number, i: number): Priority {
  const s = p * i;
  if (s >= 16) return "CRITICAL";
  if (s >= 10) return "HIGH";
  if (s >= 5) return "MEDIUM";
  return "LOW";
}

function Row({ r, projectId, canEdit, canDelete }: {
  r: Risk; projectId: string; canEdit: boolean; canDelete: boolean;
}) {
  const qc = useQueryClient();
  const { t } = useT();
  const key = ["risks", projectId];
  const patch = useMutation({
    mutationFn: (p: Partial<Risk>) => api.updateRisk(r.id, p),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
  const del = useMutation({
    mutationFn: () => api.deleteRisk(r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const clamp = (n: number) => Math.max(1, Math.min(5, n));

  return (
    <tr>
      <td className="font-medium text-slate-800 dark:text-slate-100">{r.title}</td>
      <td>{t("riskCat." + r.category)}</td>
      <td>
        {canEdit ? (
          <input className={numCls} type="number" min={1} max={5} value={r.probability} disabled={patch.isPending}
            onChange={(e) => patch.mutate({ probability: clamp(Number(e.target.value)) })} />
        ) : r.probability}
      </td>
      <td>
        {canEdit ? (
          <input className={numCls} type="number" min={1} max={5} value={r.impact} disabled={patch.isPending}
            onChange={(e) => patch.mutate({ impact: clamp(Number(e.target.value)) })} />
        ) : r.impact}
      </td>
      <td><PriorityBadge value={r.priority} /></td>
      <td>{r.owner ?? "—"}</td>
      <td>
        {canEdit ? (
          <select className={selectCls} value={r.status} disabled={patch.isPending}
            onChange={(e) => patch.mutate({ status: e.target.value as RiskStatus })}>
            {RISK_STATUSES.map((s) => <option key={s} value={s}>{t("rstatus." + s)}</option>)}
          </select>
        ) : <RiskStatusBadge value={r.status} />}
      </td>
      <td className="text-right">
        {canDelete && (
          <button className="btn-ghost px-2 py-1 text-xs text-rose-600" disabled={del.isPending}
            onClick={() => { if (confirm(`${t("c.delete")} "${r.title}"?`)) del.mutate(); }}>{t("c.delete")}</button>
        )}
      </td>
    </tr>
  );
}

export default function RisksTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const { role } = useAuth();
  const { t } = useT();
  const canDelete = canManageProjects(role);
  const qc = useQueryClient();
  const key = ["risks", projectId];
  const { data: items } = useQuery({ queryKey: key, queryFn: () => api.listRisks(projectId) });

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RiskCategory>("TECHNICAL");
  const [probability, setProbability] = useState(2);
  const [impact, setImpact] = useState(3);
  const [owner, setOwner] = useState("");

  const addMut = useMutation({
    mutationFn: () => api.createRisk({ project_id: projectId, title, category, probability, impact, owner }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setTitle(""); setOwner(""); },
  });

  function add(e: FormEvent) { e.preventDefault(); if (title.trim()) addMut.mutate(); }

  return (
    <div className="space-y-3">
      {canEdit && (
        <form onSubmit={add} className="card grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="label">{t("risk.title")}</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vendor API deprecation" />
          </div>
          <div>
            <label className="label">{t("c.category")}</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as RiskCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t("riskCat." + c)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t("risk.probability")}</label>
            <input className="input" type="number" min={1} max={5} value={probability}
              onChange={(e) => setProbability(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">{t("risk.impact")}</label>
            <input className="input" type="number" min={1} max={5} value={impact}
              onChange={(e) => setImpact(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">{t("risk.priorityAuto")}</label>
            <div className="pt-1"><PriorityBadge value={band(probability, impact)} /></div>
          </div>
          <div className="md:col-span-3">
            <label className="label">{t("c.owner")}</label>
            <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
          <div className="md:col-span-6">
            <button className="btn-primary" disabled={addMut.isPending}>{t("risk.add")}</button>
          </div>
        </form>
      )}

      <div className="card-table overflow-x-auto">
        <table className="sheet">
          <thead>
            <tr><th className="w-[28%]">{t("risk.title")}</th><th>{t("c.category")}</th><th>{t("risk.p")}</th><th>{t("risk.i")}</th><th>{t("c.priority")}</th><th>{t("c.owner")}</th><th>{t("c.status")}</th><th></th></tr>
          </thead>
          <tbody>
            {(items ?? []).map((r) => (
              <Row key={r.id} r={r} projectId={projectId} canEdit={canEdit} canDelete={canDelete} />
            ))}
            {(items ?? []).length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-slate-400">{t("risk.none")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
