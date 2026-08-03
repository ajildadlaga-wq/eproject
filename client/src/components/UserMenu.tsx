import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { Avatar } from "./ui";

/**
 * The account button in the header. Who you are signed in as, and the way
 * out — the two things people look for in the top-right corner.
 */
export default function UserMenu() {
  const { profile, role, session, signOut } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate("/login");
  }

  const name = profile?.full_name ?? "—";

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Avatar name={profile?.full_name ?? null} size={30} />
        <span className="hidden min-w-0 text-left leading-tight lg:block">
          <span className="block max-w-[9rem] truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">
            {name}
          </span>
          <span className="block text-[11px] text-slate-400">{role ? t("role." + role) : ""}</span>
        </span>
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
            <Avatar name={profile?.full_name ?? null} size={38} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</div>
              <div className="truncate text-xs text-slate-400">{session?.user.email}</div>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 text-xs">
            <span className="text-slate-400">{t("team.globalRole")}</span>
            <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {role ? t("role." + role) : "—"}
            </span>
          </div>

          <button onClick={handleSignOut} role="menuitem"
            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-slate-800 dark:hover:bg-rose-950/30">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
