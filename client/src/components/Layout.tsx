import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth, isAdmin } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { Logo, LogoMark } from "./Brand";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("theme", "light"); }
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] shrink-0">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  projects: "M3 7h18M3 12h18M3 17h18",
  admin: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  audit: "M9 12h6M9 16h6M9 8h2M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z",
};

/**
 * Three destinations do not justify a sidebar. They sit in the header, where
 * a person looks first, and the whole width of the screen goes to the work.
 */
const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
  }`;

const drawerLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

export default function Layout() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const { t, lang, toggle: toggleLang } = useT();
  const [open, setOpen] = useState(false);

  // A menu left open across a navigation covers the page you just opened.
  useEffect(() => setOpen(false), [pathname]);

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

  // The logo already goes home, so the overview needs no link of its own.
  const nav = (cls: typeof link) => (
    <>
      <NavLink to="/projects" className={cls}><Icon d={ICONS.projects} /> {t("nav.projects")}</NavLink>
      {isAdmin(role) && (
        <>
          <NavLink to="/admin" className={cls}><Icon d={ICONS.admin} /> {t("nav.admin")}</NavLink>
          <NavLink to="/audit" className={cls}><Icon d={ICONS.audit} /> {t("nav.audit")}</NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <NavLink to="/" className="shrink-0">
            <span className="hidden sm:block"><Logo size={30} /></span>
            <span className="sm:hidden"><LogoMark size={28} className="text-brand" /></span>
          </NavLink>

          <nav className="ml-6 hidden items-center gap-1 md:flex">{nav(link)}</nav>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <button onClick={toggleLang} title="Language / Хэл"
              className={`${iconBtn} w-auto px-2 text-xs font-bold`}>
              {lang === "en" ? "МН" : "EN"}
            </button>
            <button onClick={toggle} title={dark ? "Light" : "Dark"} className={iconBtn}>
              {dark ? "☀" : "☾"}
            </button>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
            <UserMenu />
            <button onClick={() => setOpen((o) => !o)} aria-label={t("nav.menu")} aria-expanded={open}
              className={`${iconBtn} md:hidden`}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation on small screens, folded under the bar */}
        {open && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 md:hidden dark:border-slate-800">
            {nav(drawerLink)}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>{t("footer.org")}</span>
          <span>{t("footer.tagline")}</span>
        </div>
      </footer>
    </div>
  );
}
