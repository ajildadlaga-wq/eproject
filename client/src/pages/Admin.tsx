import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useT } from "../i18n/LanguageContext";
import type { Role } from "../lib/types";

const ROLES: Role[] = ["ADMIN", "PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"];

export default function Admin() {
  const qc = useQueryClient();
  const { t } = useT();
  const { data: users } = useQuery({ queryKey: ["profiles"], queryFn: api.listProfiles });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [role, setRole] = useState<Role>("VIEWER");

  const createMut = useMutation({
    mutationFn: () => api.createUser({ email, password, full_name: fullName, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profiles"] }); setEmail(""); setFullName(""); },
  });
  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });

  function createUser(e: FormEvent) {
    e.preventDefault();
    if (email.trim()) createMut.mutate();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("admin.title")}</h1>

      <form onSubmit={createUser} className="card grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <label className="label">{t("c.email")}</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">{t("admin.fullName")}</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t("admin.role")}</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{t("role." + r)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t("admin.tempPassword")}</label>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="md:col-span-5">
          <button className="btn-primary" disabled={createMut.isPending}>
            {createMut.isPending ? t("admin.creating") : t("admin.createUser")}
          </button>
          {createMut.isError && <span className="ml-3 text-sm text-red-600">{(createMut.error as Error).message}</span>}
        </div>
      </form>

      <div className="card-table overflow-x-auto">
        <table className="sheet">
          <thead>
            <tr><th>{t("c.name")}</th><th>{t("admin.role")}</th></tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-slate-800 dark:text-slate-100">{u.full_name ?? u.id}</td>
                <td>
                  <select
                    className="input max-w-[14rem]"
                    value={u.role}
                    onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value as Role })}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{t("role." + r)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
