import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { Logo } from "../components/Brand";

/**
 * Self-signup.
 *
 * Submitting the form creates an account that cannot yet do anything. The
 * database only makes someone a user of E-Project once they have opened the
 * link in their mail, and it makes them a VIEWER — least privilege on
 * arrival, until an administrator decides otherwise.
 *
 * So this page does not send anyone away after the form. It waits. Every few
 * seconds it quietly tries to sign in; Supabase refuses an unconfirmed
 * account, which means the first sign-in that succeeds *is* the
 * confirmation. When it does, the person is already where they wanted to be
 * and we simply let them through.
 */

/** How often to ask, and how long to keep asking. */
const POLL_MS = 8_000;
const GIVE_UP_MS = 15 * 60 * 1_000;
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
  const [gaveUp, setGaveUp] = useState(false);

  // Wait for the address to be proven, then walk them in.
  useEffect(() => {
    if (!sentTo || gaveUp) return;
    const startedAt = Date.now();

    const tick = async () => {
      if (Date.now() - startedAt > GIVE_UP_MS) { setGaveUp(true); return; }
      // A failure here is the expected case — it means "not yet" — so it is
      // not shown to anyone. Only success is worth reacting to.
      const { data } = await supabase.auth.signInWithPassword({ email: sentTo, password });
      if (data.session) navigate("/", { replace: true });
    };

    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [sentTo, password, gaveUp, navigate]);

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
        // Send the link back to the root of this site, and to nothing deeper.
        //
        // Two reasons. Without an explicit value the link follows the
        // project's Site URL, which is easy to leave pointing at a
        // developer's laptop. And a deeper path — /login, say — is a route
        // that exists only inside the running app: a static host asked for it
        // cold has no such file and answers "Not Found", which is what the
        // person clicking the link in their mail would see.
        //
        // "/" exists everywhere. The app boots, reads the token out of the
        // fragment, and they are simply in — which is the whole point of
        // having confirmed.
        emailRedirectTo: `${window.location.origin}/`,
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
      options: { emailRedirectTo: `${window.location.origin}/` },
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
            {/* The page is doing something on their behalf, so it says so. */}
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60">
              {gaveUp ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("auth.waitTimedOut")}</p>
              ) : (
                <p className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                  {t("auth.waitingConfirm")}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-400">{t("auth.nothingUntilConfirmed")}</p>
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
