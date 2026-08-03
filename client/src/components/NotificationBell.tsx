import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n/LanguageContext";
import { formatDate } from "../i18n/date";
import { useNotifications, type Notice, type NoticeKind } from "../lib/notifications";

const TONE: Record<NoticeKind, { dot: string; text: string }> = {
  review: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  rejected: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-400" },
  overdue: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-400" },
  due: { dot: "bg-brand-500", text: "text-brand-600 dark:text-brand-300" },
};

export default function NotificationBell() {
  const { session } = useAuth();
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { notices, unreadCount, markAllRead, markRead, isRead } = useNotifications(session?.user.id);

  // Close on an outside click or Escape — a panel you cannot dismiss is a trap.
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

  function go(n: Notice) {
    markRead(n.id);
    setOpen(false);
    navigate(`/projects/${n.projectId}`);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("notif.title")}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("notif.title")}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-brand hover:underline">
                {t("notif.markAll")}
              </button>
            )}
          </div>

          {notices.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">{t("notif.none")}</p>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto">
              {notices.map((n) => {
                const tone = TONE[n.kind];
                const seen = isRead(n.id);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => go(n)}
                      className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50 ${
                        seen ? "opacity-60" : ""
                      }`}
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${seen ? "bg-slate-300 dark:bg-slate-600" : tone.dot}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs font-semibold ${tone.text}`}>{t("notif." + n.kind)}</span>
                        <span className="mt-0.5 block truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {n.taskName}
                        </span>
                        {n.detail && (
                          <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            {n.detail}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {n.projectName} · {formatDate(n.at, lang, "medium")}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
