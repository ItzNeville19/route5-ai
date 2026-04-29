"use client";

import { Search } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCommandPalette } from "@/components/CommandPalette";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { useI18n } from "@/components/i18n/I18nProvider";
import { primaryModLabelFromNavigator } from "@/lib/platform-shortcuts";

type Props = {
  /**
   * Expands to fill space between brand and nav (capped on wide viewports so the pill
   * does not stretch across the entire monitor).
   */
  fill?: boolean;
};

/** Opens the global command palette (⌘K / /). */
export default function WorkspaceHeaderSearch({ fill = false }: Props) {
  const { t } = useI18n();
  const { open } = useCommandPalette();
  const { workspacePaletteLight } = useWorkspaceExperience();
  const reduceMotion = useReducedMotion();
  const mod = primaryModLabelFromNavigator();

  /** Compact pill (sidebar / tight spots). */
  const compactLight = workspacePaletteLight
    ? "route5-header-search inline-flex h-8 min-h-0 w-auto max-w-[min(100%,min(92vw-10rem,18rem))] shrink-0 flex-none items-center gap-1.5 rounded-full border border-slate-300/70 bg-white px-2.5 py-1.5 text-left text-[12px] text-slate-600 shadow-inner shadow-slate-900/8 transition-all duration-200 hover:border-sky-400/45 hover:bg-white hover:shadow-md hover:shadow-slate-900/10 sm:max-w-[min(20rem,calc(100vw-14rem))] md:max-w-[min(18rem,42vw)] xl:max-w-[17rem] 2xl:max-w-[15.5rem]"
    : "route5-header-search inline-flex h-8 min-h-0 w-auto max-w-[min(100%,min(92vw-10rem,18rem))] shrink-0 flex-none items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/32 px-2.5 py-1.5 text-left text-[12px] text-[var(--workspace-muted-fg)] shadow-inner shadow-black/25 transition-all duration-200 hover:border-emerald-500/25 hover:bg-emerald-950/20 hover:text-[var(--workspace-fg)] hover:shadow-lg hover:shadow-emerald-950/20 sm:max-w-[min(20rem,calc(100vw-14rem))] md:max-w-[min(18rem,42vw)] xl:max-w-[17rem] 2xl:max-w-[15.5rem]";

  /** Toolbar row: grow into space between logo and nav, capped on wide screens. Narrow viewports: icon-only tap target. */
  const fillLight = workspacePaletteLight
    ? "route5-header-search inline-flex h-8 min-h-[2rem] w-full min-w-0 max-w-full shrink items-center justify-start gap-2 rounded-full border border-slate-300/70 bg-white px-2.5 py-1.5 text-left text-[12px] text-slate-600 shadow-inner shadow-slate-900/8 transition-all duration-200 hover:border-sky-400/45 hover:bg-white hover:shadow-md hover:shadow-slate-900/10 min-w-[2.75rem] max-w-[min(18rem,100%)] sm:min-w-0 sm:px-3 sm:max-w-[min(18rem,calc(100vw-22rem))] md:max-w-[min(17rem,calc(100vw-26rem))] lg:max-w-[17rem] xl:max-w-[18rem] 2xl:max-w-[19rem] max-sm:max-w-[2.75rem] max-sm:min-w-[2.75rem] max-sm:justify-center max-sm:px-0"
    : "route5-header-search inline-flex h-8 min-h-[2rem] w-full min-w-0 max-w-full shrink items-center justify-start gap-2 rounded-full border border-white/[0.08] bg-black/32 px-2.5 py-1.5 text-left text-[12px] text-[var(--workspace-muted-fg)] shadow-inner shadow-black/25 transition-all duration-200 hover:border-emerald-500/25 hover:bg-emerald-950/20 hover:text-[var(--workspace-fg)] hover:shadow-lg hover:shadow-emerald-950/20 min-w-[2.75rem] max-w-[min(18rem,100%)] sm:min-w-0 sm:px-3 sm:max-w-[min(18rem,calc(100vw-22rem))] md:max-w-[min(17rem,calc(100vw-26rem))] lg:max-w-[17rem] xl:max-w-[18rem] 2xl:max-w-[19rem] max-sm:max-w-[2.75rem] max-sm:min-w-[2.75rem] max-sm:justify-center max-sm:px-0";

  const light = fill ? fillLight : compactLight;

  return (
    <motion.button
      type="button"
      onClick={() => open()}
      className={light}
      aria-label={t("workspace.chrome.search.aria")}
      whileHover={
        reduceMotion
          ? undefined
          : { y: -1, scale: 1.01, transition: { type: "spring", stiffness: 500, damping: 28 } }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Search
        className={`h-3.5 w-3.5 shrink-0 opacity-[0.82] ${workspacePaletteLight ? "text-slate-500" : ""}`}
        strokeWidth={2}
        style={workspacePaletteLight ? undefined : { color: "var(--workspace-muted-fg)" }}
      />
      <span
        className={
          fill
            ? "min-w-0 flex-1 truncate text-left max-sm:sr-only"
            : "min-w-0 max-w-[9.5rem] truncate sm:max-w-[12rem] md:max-w-[11rem]"
        }
      >
        {t("workspace.chrome.search.placeholder")}
      </span>
      <kbd
        className={
          workspacePaletteLight
            ? "hidden shrink-0 rounded border border-slate-300/45 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 sm:inline max-sm:hidden"
            : "hidden shrink-0 rounded border border-white/12 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200/55 sm:inline max-sm:hidden"
        }
      >
        {mod}K
      </kbd>
    </motion.button>
  );
}
