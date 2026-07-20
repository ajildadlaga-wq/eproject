import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";

const DEMO: [string, string][] = [
  ["admin@pms.local", "SUPER_ADMIN"],
  ["pm@pms.local", "PROJECT_MANAGER"],
  ["editor@pms.local", "EDITOR"],
  ["viewer@pms.local", "VIEWER"],
];

export default function Login() {
  const { session, signIn } = useAuth();
  const { t, lang, toggle } = useT();
  const toast = useToast();
  const navigate = useNavigate();
  // Prefill demo credentials in dev builds only.
  const [email, setEmail] = useState(import.meta.env.DEV ? "admin@pms.local" : "");
  const [password, setPassword] = useState(import.meta.env.DEV ? "Password123!" : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error);
    else navigate("/");
  }

  async function onForgot() {
    if (!email.trim()) {
      setError(t("auth.enterEmailFirst"));
      return;
    }
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(t("auth.resetSent"));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 self-end">
            <button onClick={toggle} className="btn-ghost px-2.5 py-1 text-xs">
              {lang === "en" ? "МН" : "EN"}
            </button>
          </div>
          <h1 className="text-2xl font-bold text-brand">PMS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("login.subtitle")}</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40">{error}</div>}
          <div>
            <label className="label">{t("c.email")}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("c.password")}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn-primary w-full justify-center" disabled={busy}>
            {busy ? t("c.loading") : t("nav.signIn")}
          </button>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={onForgot} className="text-brand hover:underline">
              {t("auth.forgot")}
            </button>
            <span className="text-slate-400">
              {t("auth.noAccount")}{" "}
              <Link to="/signup" className="text-brand hover:underline">{t("auth.signupBtn")}</Link>
            </span>
          </div>
        </form>
        {import.meta.env.DEV && (
          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            <p className="mb-1 font-semibold">{t("login.demo")}</p>
            <ul className="space-y-0.5">
              {DEMO.map(([mail, roleKey]) => (
                <li key={mail}>
                  <button className="text-brand hover:underline" onClick={() => { setEmail(mail); setPassword("Password123!"); }}>
                    {mail}
                  </button>{" "}— {t("role." + roleKey)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
