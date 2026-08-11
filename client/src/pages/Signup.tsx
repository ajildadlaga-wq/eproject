import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { Logo } from "../components/Brand";

/**
 * Self-signup. The handle_new_user trigger creates the profile with the
 * default VIEWER role — least privilege until an admin grants more.
 */
export default function Signup() {
  const { session } = useAuth();
  const { t, lang, toggle } = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set once the account exists and the confirmation mail is on its way.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError(t("auth.min6"));
    if (password !== confirm) return setError(t("auth.mismatch"));

    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },   // role defaults to VIEWER via trigger
        // Send the link back to this site's sign-in page. Without this the
        // link follows the project's Site URL, which is easy to leave pointing
        // at a developer's laptop.
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
      },
    });
    setBusy(false);
    if (error) return setError(error.message);

    if (data.session) {
      // Email confirmation disabled -> signed in immediately.
      navigate("/");
    } else {
      // The account is not usable until the address is proven. Staying on this
      // page and saying so beats dropping the person on a sign-in form that
      // will refuse them.
      setSentTo(email.trim());
    }
  }

  async function onResend() {
    if (!sentTo) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: sentTo,
      options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else setResent(true);
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
          <Logo size={38} />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("auth.signupTitle")}</p>
        </div>
        {sentTo ? (
          <div className="card space-y-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-light">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent-dark" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {t("auth.confirmSentTitle")}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t("auth.confirmSentBody")}</p>
              <p className="mt-2 break-all text-sm font-semibold text-brand">{sentTo}</p>
            </div>
            <p className="text-xs text-slate-400">{t("auth.confirmSentHint")}</p>
            <div className="space-y-2">
              {resent ? (
                <p className="text-xs font-medium text-accent-dark">{t("auth.confirmResent")}</p>
              ) : (
                <button className="btn-ghost w-full justify-center" disabled={busy} onClick={onResend}>
                  {busy ? t("c.loading") : t("auth.confirmResend")}
                </button>
              )}
              <Link to="/login" className="block text-xs text-slate-400 hover:text-brand">
                {t("auth.backToLogin")}
              </Link>
            </div>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="card space-y-4">
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40">{error}</div>}
          <div>
            <label className="label">{t("auth.fullName")}</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t("c.email")}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t("c.password")}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t("auth.confirmPassword")}</label>
            <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button className="btn-primary w-full justify-center" disabled={busy}>
            {busy ? t("c.loading") : t("auth.signupBtn")}
          </button>
          <p className="text-xs text-slate-400">{t("auth.signupNote")}</p>
          <p className="text-center text-xs text-slate-400">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="text-brand hover:underline">{t("nav.signIn")}</Link>
          </p>
        </form>
        )}
      </div>
    </div>
  );
}
