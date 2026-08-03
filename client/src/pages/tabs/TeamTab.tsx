import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Avatar } from "../../components/ui";
import { useT } from "../../i18n/LanguageContext";
import type { MemberRole } from "../../lib/types";

export default function TeamTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const { t } = useT();
  const key = ["members", projectId];
  const { data: members } = useQuery({ queryKey: key, queryFn: () => api.listMembers(projectId) });
  const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: api.listProfiles, enabled: canManage });

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<MemberRole>("TEAM_MEMBER");

  const add = useMutation({
    mutationFn: () => api.addMember(projectId, userId, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setUserId(""); },
  });
  const remove = useMutation({
    mutationFn: (uid: string) => api.removeMember(projectId, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const memberIds = new Set((members ?? []).map((m) => m.user_id));
  const candidates = (profiles ?? []).filter((p) => !memberIds.has(p.id) && p.role !== "ADMIN");

  return (
    <div className="space-y-3">
      {canManage && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (userId) add.mutate(); }}
          className="card grid gap-3 md:grid-cols-6"
        >
          <div className="md:col-span-3">
            <label className="label">{t("team.addMember")}</label>
            <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">{t("team.selectUser")}</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name ?? p.id} ({p.role})</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">{t("team.projectRole")}</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
              <option value="TEAM_MEMBER">{t("team.editorCap")}</option>
              <option value="VIEWER">{t("team.viewerCap")}</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" disabled={add.isPending || !userId}>{t("c.add")}</button>
          </div>
          {add.isError && <p className="md:col-span-6 text-xs text-rose-600">{(add.error as Error).message}</p>}
        </form>
      )}

      <div className="card-table overflow-x-auto">
        <table className="sheet">
          <thead>
            <tr><th className="w-[50%]">{t("team.member")}</th><th>{t("team.globalRole")}</th><th>{t("team.projectRoleCol")}</th><th></th></tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.user_id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.profile?.full_name ?? null} size={28} />
                    <span className="font-medium text-slate-800 dark:text-slate-100">{m.profile?.full_name ?? m.user_id}</span>
                  </div>
                </td>
                <td className="text-slate-500">{m.profile?.role ? t("role." + m.profile.role) : "—"}</td>
                <td>
                  <span className={`badge ${m.member_role === "TEAM_MEMBER" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600"}`}>
                    {m.member_role}
                  </span>
                </td>
                <td className="text-right">
                  {canManage && (
                    <button className="btn-ghost px-2 py-1 text-xs text-rose-600" disabled={remove.isPending}
                      onClick={() => remove.mutate(m.user_id)}>{t("c.remove")}</button>
                  )}
                </td>
              </tr>
            ))}
            {(members ?? []).length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-slate-400">{t("team.none")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
