"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Workspace-wide keyboard shortcuts + ? help overlay.
 */
export default function WorkspaceShortcuts() {
  const pathname = usePathname();
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        const t = e.target as HTMLElement | null;
        if (
          t?.tagName === "INPUT" ||
          t?.tagName === "TEXTAREA" ||
          t?.tagName === "SELECT" ||
          t?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        window.dispatchEvent(new Event("route5:notifications-open"));
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        if (
          t?.tagName === "INPUT" ||
          t?.tagName === "TEXTAREA" ||
          t?.tagName === "SELECT" ||
          t?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }

      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== "n") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('[contenteditable="true"]')) return;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      e.preventDefault();
      if (pathname === "/overview") {
        document.getElementById("new-project-name")?.focus();
        return;
      }
      if (pathname?.startsWith("/projects/")) {
        router.push("/overview#new-project");
        window.setTimeout(() => {
          document.getElementById("new-project-name")?.focus();
        }, 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  const help =
    helpOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100010] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-[min(10vh,80px)] backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={() => setHelpOpen(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-2xl border border-white/12 bg-zinc-950/88 p-6 shadow-2xl ring-1 ring-white/[0.07] backdrop-blur-2xl backdrop-saturate-150 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.06)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="absolute right-3 top-3 rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="pr-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
                  Keyboard-first
                </p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-zinc-50">Shortcuts</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  Press{" "}
                  <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-zinc-100 shadow-sm">
                    ?
                  </kbd>{" "}
                  anytime outside a text field                   to toggle this panel. Open the command palette (⌘K) for routes.
                </p>
              </div>

              <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/[0.12] px-3 py-2.5">
                <p className="text-[12px] font-semibold text-zinc-100">Command palette holds most shortcuts</p>
                <p className="mt-1 text-[12px] leading-snug text-zinc-300">
                  Press{" "}
                  <kbd className="rounded-md border border-white/20 bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-amber-100">
                    ⌘K
                  </kbd>{" "}
                  — then type to filter Desk, Overview, Settings, projects, privacy, plans. Use{" "}
                  <kbd className="rounded-md border border-white/20 bg-black/30 px-1 py-0.5 font-mono text-[10px]">
                    ↑
                  </kbd>{" "}
                  <kbd className="rounded-md border border-white/20 bg-black/30 px-1 py-0.5 font-mono text-[10px]">
                    ↓
                  </kbd>{" "}
                  and{" "}
                  <kbd className="rounded-md border border-white/20 bg-black/30 px-1.5 py-0.5 font-mono text-[10px]">
                    Enter
                  </kbd>{" "}
                  to jump.
                </p>
              </div>

              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                Global hotkeys
              </p>
              <ul className="mt-2 space-y-0 text-[14px]">
                <li className="flex justify-between gap-4 border-b border-white/[0.08] py-3">
                  <span className="font-medium text-zinc-200">Command palette</span>
                  <kbd className="shrink-0 rounded-lg border border-white/20 bg-white/[0.08] px-2 py-1 font-mono text-[12px] font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    ⌘K
                  </kbd>
                </li>
                <li className="flex flex-col gap-2 border-b border-white/[0.08] py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="font-medium text-zinc-200">Updates &amp; digest</span>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <kbd className="rounded-lg border border-white/20 bg-white/[0.08] px-2 py-1 font-mono text-[11px] font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      ⌘⇧U
                    </kbd>
                    <kbd className="rounded-lg border border-white/20 bg-white/[0.08] px-2 py-1 font-mono text-[11px] font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      Ctrl+Shift+U
                    </kbd>
                  </div>
                </li>
                <li className="flex justify-between gap-4 border-b border-white/[0.08] py-3">
                  <span className="font-medium text-zinc-200">New project</span>
                  <kbd className="shrink-0 rounded-lg border border-white/20 bg-white/[0.08] px-2 py-1 font-mono text-[12px] font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    ⌘N
                  </kbd>
                </li>
                <li className="flex justify-between gap-4 border-b border-white/[0.08] py-3">
                  <span className="font-medium text-zinc-200">Open palette (alt)</span>
                  <kbd className="shrink-0 rounded-lg border border-white/20 bg-white/[0.08] px-2 py-1 font-mono text-[12px] font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    ⌘Space
                  </kbd>
                </li>
                <li className="flex justify-between gap-4 py-3">
                  <span className="font-medium text-zinc-200">This help panel</span>
                  <kbd className="shrink-0 rounded-lg border border-white/20 bg-white/[0.08] px-2 py-1 font-mono text-[12px] font-medium text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    ?
                  </kbd>
                </li>
              </ul>
              <p className="mt-2 text-center text-[12px] text-zinc-300">
                Tip:{" "}
                <kbd className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-zinc-200">
                  Esc
                </kbd>{" "}
                closes palettes and dialogs when focus allows.
              </p>
            </div>
          </div>,
          document.body
        )
      : null;

  return help;
}
