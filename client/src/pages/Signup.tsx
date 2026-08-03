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
      options: { data: { full_name: fullName.trim() } }, // role defaults to VIEWER via trigger
    });
    setBusy(false);
    if (error) return setError(error.message);

    if (data.session) {
      // Email confirmation disabled -> signed in immediately.
      navigate("/");
    } else {
      // Email confirmation required first.
      toast.success(t("auth.checkEmail"));
      navigate("/login");
    }
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
      </div>
    </div>
  );
}
