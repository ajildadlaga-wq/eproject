import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, isAdmin } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { Avatar } from "./ui";
import { Logo } from "./Brand";

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

const navItem = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand text-white shadow-sm"
      : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  projects: "M3 7h18M3 12h18M3 17h18",
  admin: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
};

export default function Layout() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const { t, lang, toggle: toggleLang } = useT();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden dark:border-slate-800 dark:bg-slate-900">
        <button onClick={() => setOpen(true)} className="flex flex-col gap-1 p-1" aria-label="Open menu">
          <span className="h-0.5 w-5 rounded bg-slate-600 dark:bg-slate-300" />
          <span className="h-0.5 w-5 rounded bg-slate-600 dark:bg-slate-300" />
          <span className="h-0.5 w-5 rounded bg-slate-600 dark:bg-slate-300" />
        </button>
        <Logo size={26} />
      </div>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 flex-col bg-ink px-3 py-4 transition-transform md:sticky md:top-0 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        onClick={() => setOpen(false)}>
        <div className="flex items-center gap-2 px-2 pb-5">
          <Logo size={32} tone="dark" subtitle={t("nav.workspace")} className="flex-1 min-w-0" />
          <button onClick={toggleLang} title="Language / Хэл"
            className="flex h-7 items-center justify-center rounded-lg px-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10 hover:text-white">
            {lang === "en" ? "МН" : "EN"}
          </button>
          <button onClick={toggle} title="Toggle theme"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white">
            {dark ? "☀" : "☾"}
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("nav.menu")}</div>
          <NavLink to="/" end className={navItem}><Icon d={ICONS.dashboard} /> {t("nav.dashboard")}</NavLink>
          <NavLink to="/projects" className={navItem}><Icon d={ICONS.projects} /> {t("nav.projects")}</NavLink>
          {isAdmin(role) && <NavLink to="/admin" className={navItem}><Icon d={ICONS.admin} /> {t("nav.admin")}</NavLink>}
        </nav>

        <div className="mt-auto rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={profile?.full_name ?? null} size={34} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-white">{profile?.full_name ?? "—"}</div>
              <div className="text-[11px] text-slate-400">{role?.replace("_", " ")}</div>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="mt-3 w-full rounded-lg border border-white/10 px-2 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white">
            {t("nav.signOut")}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1 pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
