import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";

/**
 * Landing page for the password-recovery email link. The link contains a
 * recovery token; supabase-js exchanges it for a session automatically
 * (detectSessionInUrl), so by the time this renders the user is signed in
 * and we can simply set the new password.
 */
export default function ResetPassword() {
  const { session, loading } = useAuth();
  const { t, lang, toggle } = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError(t("auth.min6"));
    if (password !== confirm) return setError(t("auth.mismatch"));

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    toast.success(t("auth.passwordUpdated"));
    navigate("/");
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
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("auth.resetTitle")}</p>
        </div>

        {loading ? (
          <div className="card text-center text-sm text-slate-500">{t("c.loading")}</div>
        ) : !session ? (
          <div className="card space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>{t("auth.invalidLink")}</p>
            <Link to="/login" className="text-brand hover:underline">{t("auth.backToLogin")}</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card space-y-4">
            {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40">{error}</div>}
            <div>
              <label className="label">{t("auth.newPassword")}</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">{t("auth.confirmPassword")}</label>
              <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <button className="btn-primary w-full justify-center" disabled={busy}>
              {busy ? t("c.loading") : t("auth.updatePassword")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
