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
      if (pathname === "/projects") {
        document.getElementById("new-project-name")?.focus();
        return;
      }
      if (pathname?.startsWith("/projects/")) {
        router.push("/projects#new-project");
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
            className="fixed inset-0 z-[100010] flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-[min(10vh,80px)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            onClick={() => setHelpOpen(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-6 text-[var(--workspace-fg)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="absolute right-3 top-3 rounded-lg p-2 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="pr-10 text-[18px] font-semibold tracking-tight">Shortcuts</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
                Press <kbd className="rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-1.5 py-0.5 font-mono text-[11px]">?</kbd>{" "}
                anytime outside a text field to toggle this panel.
              </p>
              <ul className="mt-5 space-y-3 text-[14px]">
                <li className="flex justify-between gap-4 border-b border-[var(--workspace-border)] pb-3">
                  <span className="text-[var(--workspace-muted-fg)]">Command palette</span>
                  <kbd className="shrink-0 rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2 py-0.5 font-mono text-[12px]">⌘K</kbd>
                </li>
                <li className="flex justify-between gap-4 border-b border-[var(--workspace-border)] pb-3">
                  <span className="text-[var(--workspace-muted-fg)]">New project</span>
                  <kbd className="shrink-0 rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2 py-0.5 font-mono text-[12px]">⌘N</kbd>
                </li>
                <li className="flex justify-between gap-4 border-b border-[var(--workspace-border)] pb-3">
                  <span className="text-[var(--workspace-muted-fg)]">Open palette (alt)</span>
                  <kbd className="shrink-0 rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2 py-0.5 font-mono text-[12px]">⌘Space</kbd>
                </li>
                <li className="flex justify-between gap-4 pb-1">
                  <span className="text-[var(--workspace-muted-fg)]">This help</span>
                  <kbd className="shrink-0 rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2 py-0.5 font-mono text-[12px]">?</kbd>
                </li>
              </ul>
            </div>
          </div>,
          document.body
        )
      : null;

  return help;
}
