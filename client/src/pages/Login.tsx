import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { Logo, LogoMark } from "../components/Brand";

const DEMO: [string, string][] = [
  ["admin@pms.local", "ADMIN"],
  ["pm@pms.local", "PROJECT_MANAGER"],
  ["editor@pms.local", "TEAM_MEMBER"],
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
  const [params] = useSearchParams();
  const justConfirmed = params.get("confirmed") === "1";

  // Following the confirmation link signs the account in. Confirming an
  // address and signing in are two different acts, so end that session and
  // let the person type their password.
  useEffect(() => {
    if (justConfirmed && session) void supabase.auth.signOut();
  }, [justConfirmed, session]);

  if (session && !justConfirmed) return <Navigate to="/" replace />;

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
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* Brand panel — hidden on small screens */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink p-12 lg:flex">
        {/* Decorative Gantt-bar motif */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 text-white/[0.04]"
          viewBox="0 0 300 300"
          fill="currentColor"
        >
          <rect x="18" y="18" width="264" height="264" rx="58" />
        </svg>
        <div className="relative">
          <LogoMark size={52} className="text-brand-400" />
          <h1 className="mt-7 text-3xl font-bold leading-tight text-white">E-Project</h1>
          <p className="mt-1 text-sm font-medium text-brand-300">{t("login.tagline")}</p>
        </div>
        <ul className="relative space-y-4">
          {["login.point1", "login.point2", "login.point3"].map((k) => (
            <li key={k} className="flex items-start gap-3 text-sm text-slate-300">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none"
                stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
              {t(k)}
            </li>
          ))}
        </ul>
        <p className="relative text-xs text-slate-500">{t("login.footer")}</p>
      </aside>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-start justify-between">
            <div className="lg:hidden">
              <Logo size={34} subtitle={t("login.subtitle")} />
            </div>
            <div className="hidden lg:block">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("login.welcome")}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("login.subtitle")}</p>
            </div>
            <button onClick={toggle} className="btn-ghost shrink-0 px-2.5 py-1 text-xs">
              {lang === "en" ? "МН" : "EN"}
            </button>
          </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          {justConfirmed && (
            <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent-light p-2.5 text-sm text-accent-dark">
              <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor"
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12.5l5 5L20 6.5" />
              </svg>
              {t("auth.confirmed")}
            </div>
          )}
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
    </div>
  );
}
