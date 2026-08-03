import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, isAdmin } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { Avatar } from "./ui";
import { Logo, LogoMark } from "./Brand";
import NotificationBell from "./NotificationBell";

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
      strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  projects: "M3 7h18M3 12h18M3 17h18",
  admin: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
};

const navItem = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand text-white shadow-sm"
      : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

/** The heading in the top bar — tells you where you are at a glance. */
function usePageTitle() {
  const { pathname } = useLocation();
  const { t } = useT();
  if (pathname.startsWith("/admin")) return t("nav.admin");
  if (pathname.startsWith("/projects")) return t("nav.projects");
  return t("nav.dashboard");
}

export default function Layout() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const { t, lang, toggle: toggleLang } = useT();
  const [open, setOpen] = useState(false);
  const title = usePageTitle();

  // A drawer left open across a navigation covers the page you just opened.
  useEffect(() => setOpen(false), [pathname]);

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200";

  const nav = (
    <>
      <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {t("nav.menu")}
      </div>
      <NavLink to="/" end className={navItem}><Icon d={ICONS.dashboard} /> {t("nav.dashboard")}</NavLink>
      <NavLink to="/projects" className={navItem}><Icon d={ICONS.projects} /> {t("nav.projects")}</NavLink>
      {isAdmin(role) && (
        <>
          <div className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {t("nav.system")}
          </div>
          <NavLink to="/admin" className={navItem}><Icon d={ICONS.admin} /> {t("nav.admin")}</NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Backdrop for the mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-ink px-3 py-4 transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-2 pb-6">
          <Logo size={32} tone="dark" subtitle={t("nav.workspace")} />
        </div>

        <nav className="flex flex-col gap-1">{nav}</nav>

        <div className="mt-auto rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={profile?.full_name ?? null} size={34} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-white">{profile?.full_name ?? "—"}</div>
              <div className="truncate text-[11px] text-slate-400">{role ? t("role." + role) : ""}</div>
            </div>
          </div>
          <button onClick={handleSignOut}
            className="mt-3 w-full rounded-lg border border-white/10 px-2 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
            {t("nav.signOut")}
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6 dark:border-slate-800 dark:bg-slate-900/90">
          <button onClick={() => setOpen(true)} aria-label={t("nav.menu")}
            className={`${iconBtn} md:hidden`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>

          <span className="md:hidden"><LogoMark size={26} className="text-brand" /></span>
          <h1 className="hidden truncate text-base font-semibold text-slate-800 md:block dark:text-slate-100">
            {title}
          </h1>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <button onClick={toggleLang} title="Language / Хэл"
              className={`${iconBtn} w-auto px-2 text-xs font-bold`}>
              {lang === "en" ? "МН" : "EN"}
            </button>
            <button onClick={toggle} title={dark ? "Light" : "Dark"} className={iconBtn}>
              {dark ? "☀" : "☾"}
            </button>
            <span className="ml-1 hidden sm:block">
              <Avatar name={profile?.full_name ?? null} size={30} />
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1">
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
    </div>
  );
}
