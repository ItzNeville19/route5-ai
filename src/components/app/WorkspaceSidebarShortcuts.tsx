"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Library, Zap } from "lucide-react";
import { useCommandPalette } from "@/components/CommandPalette";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { WORKSPACE_SHORTCUTS, type WorkspaceShortcut } from "@/lib/workspace-shortcuts";

export default function WorkspaceSidebarShortcuts({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const router = useRouter();
  const { open: openPalette } = useCommandPalette();
  const exp = useWorkspaceExperience();

  if (collapsed) {
    return (
      <div className="mt-3 border-t border-[var(--workspace-border)]/80 pt-3">
        <Link
          href="/marketplace"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--workspace-border)]/80 bg-[var(--workspace-canvas)]/40 px-2 py-2 text-[var(--workspace-accent)] transition hover:bg-white/[0.06] md:justify-center"
          title="App library — full list when you expand the sidebar"
        >
          <Library className="h-4 w-4 shrink-0" aria-hidden />
          <span className="md:sr-only">App library</span>
        </Link>
      </div>
    );
  }

  function run(s: WorkspaceShortcut) {
    if ("href" in s) {
      router.push(s.href);
      return;
    }
    if (s.action === "palette") openPalette();
    if (s.action === "relay") window.dispatchEvent(new Event("route5:assistant-open"));
    if (s.action === "activityPanel") exp.setPrefs({ rightPanelOpen: true });
  }

  return (
    <div className="mt-3 border-t border-[var(--workspace-border)]/80 pt-3">
      <p className="flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-muted-fg)]">
        <Library className="h-3 w-3 shrink-0 text-[var(--workspace-accent)]" aria-hidden />
        App library
      </p>
      <div
        className="mt-2 max-h-[min(220px,32vh)] space-y-0.5 overflow-y-auto overscroll-contain pr-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {WORKSPACE_SHORTCUTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => run(s)}
            title={s.label}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--workspace-muted-fg)] transition hover:bg-white/[0.06] hover:text-[var(--workspace-fg)]"
          >
            <Zap className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
