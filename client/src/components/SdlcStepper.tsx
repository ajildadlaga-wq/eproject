import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { SDLC_PHASES, type SdlcPhase } from "../lib/types";
import { useT } from "../i18n/LanguageContext";

export default function SdlcStepper({
  projectId, current, canManage,
}: { projectId: string; current: SdlcPhase; canManage: boolean }) {
  const qc = useQueryClient();
  const { t } = useT();
  const set = useMutation({
    mutationFn: (phase: SdlcPhase) => api.setSdlcPhase(projectId, phase),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const currentIdx = SDLC_PHASES.indexOf(current);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("sdlc.title")}</h2>
        <span className="text-xs text-slate-400">
          {canManage ? t("sdlc.click") : t("sdlc.readOnly")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {SDLC_PHASES.map((phase, idx) => {
          const isCurrent = idx === currentIdx;
          const isDone = idx < currentIdx;
          return (
            <button
              key={phase}
              disabled={!canManage || set.isPending}
              onClick={() => set.mutate(phase)}
              className={`rounded-xl border p-3 text-left transition ${
                isCurrent
                  ? "border-brand bg-brand/10 text-brand"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900"
              } ${canManage ? "cursor-pointer hover:border-brand/50" : "cursor-default"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                  {t("sdlc.phase")} {idx + 1}
                </span>
                {isDone ? <span className="text-emerald-500">✓</span>
                  : isCurrent ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}
              </div>
              <div className="mt-1 text-xs font-semibold leading-tight">{t("phase." + phase)}</div>
            </button>
          );
        })}
      </div>
      {set.isError && <p className="mt-2 text-xs text-rose-600">{(set.error as Error).message}</p>}
    </div>
  );
}
