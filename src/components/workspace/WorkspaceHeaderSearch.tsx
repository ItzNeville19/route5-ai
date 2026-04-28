"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useI18n } from "@/components/i18n/I18nProvider";

/** Opens the global command palette (⌘K / /). */
export default function WorkspaceHeaderSearch() {
  const { t } = useI18n();
  const { open } = useCommandPalette();
  const { workspacePaletteLight } = useWorkspaceExperience();

  return (
    <button
      type="button"
      onClick={() => open()}
      className={
        workspacePaletteLight
          ? "route5-header-search inline-flex min-w-0 max-w-[min(100%,200px)] flex-1 items-center gap-1.5 rounded-full border border-slate-300/70 bg-white px-2.5 py-1.5 text-left text-[12px] text-slate-600 shadow-inner shadow-slate-900/8 transition hover:border-sky-400/45 hover:bg-white hover:text-slate-900 sm:max-w-[min(100%,260px)] md:max-w-[min(100%,280px)] lg:max-w-[300px]"
          : "route5-header-search inline-flex min-w-0 max-w-[min(100%,200px)] flex-1 items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/32 px-2.5 py-1.5 text-left text-[12px] text-[var(--workspace-muted-fg)] shadow-inner shadow-black/25 transition hover:border-emerald-500/25 hover:bg-emerald-950/20 hover:text-[var(--workspace-fg)] sm:max-w-[min(100%,260px)] md:max-w-[min(100%,280px)] lg:max-w-[300px]"
      }
      aria-label={t("workspace.chrome.search.aria")}
    >
      <Search
        className={`h-3.5 w-3.5 shrink-0 opacity-[0.82] ${workspacePaletteLight ? "text-slate-500" : ""}`}
        strokeWidth={2}
        style={workspacePaletteLight ? undefined : { color: "var(--workspace-muted-fg)" }}
      />
      <span className="min-w-0 flex-1 truncate">{t("workspace.chrome.search.placeholder")}</span>
      <kbd
        className={
          workspacePaletteLight
            ? "hidden shrink-0 rounded border border-slate-300/45 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 sm:inline"
            : "hidden shrink-0 rounded border border-white/12 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200/55 sm:inline"
        }
      >
        ⌘K
      </kbd>
    </button>
  );
}
