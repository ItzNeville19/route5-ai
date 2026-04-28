"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";

/** Opens the global command palette (⌘K / /). */
export default function WorkspaceHeaderSearch() {
  const { open } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => open()}
      className="route5-header-search inline-flex min-w-0 max-w-[min(100%,200px)] flex-1 items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/32 px-2.5 py-1.5 text-left text-[12px] text-emerald-100/52 shadow-inner shadow-black/25 transition hover:border-emerald-500/25 hover:bg-emerald-950/20 hover:text-emerald-100/80 sm:max-w-[min(100%,260px)] md:max-w-[min(100%,280px)] lg:max-w-[300px]"
      aria-label="Search workspace — Command K"
    >
      <Search className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
      <span className="min-w-0 flex-1 truncate">Search…</span>
      <kbd className="hidden shrink-0 rounded border border-white/12 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-emerald-200/55 sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
