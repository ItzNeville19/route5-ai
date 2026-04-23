"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  primaryModLabelFromNavigator,
  shortcutsSheetPlatformNotes,
} from "@/lib/platform-shortcuts";

/**
 * Workspace keyboard shortcuts — toggle with ? outside inputs, or open via
 * window.dispatchEvent(new Event("route5:shortcuts-open")) from sidebar / header.
 */
export default function WorkspaceShortcuts() {
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const modLabel = primaryModLabelFromNavigator();
  const platformNotes = shortcutsSheetPlatformNotes();

  const isEditingTarget = (t: HTMLElement | null) =>
    t?.tagName === "INPUT" ||
    t?.tagName === "TEXTAREA" ||
    t?.tagName === "SELECT" ||
    t?.isContentEditable;

  useEffect(() => {
    const open = () => setHelpOpen(true);
    const close = () => setHelpOpen(false);
    window.addEventListener("route5:shortcuts-open", open);
    window.addEventListener("route5:shortcuts-close", close);
    return () => {
      window.removeEventListener("route5:shortcuts-open", open);
      window.removeEventListener("route5:shortcuts-close", close);
    };
  }, []);

  useEffect(() => {
    if (!helpOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setHelpOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [helpOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        if (isEditingTarget(t)) return;
        e.preventDefault();
        window.dispatchEvent(new Event("route5:notifications-open"));
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isEditingTarget(t)) return;
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        if (isEditingTarget(t)) return;
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        if (isEditingTarget(t)) return;
        e.preventDefault();
        window.dispatchEvent(new Event("route5:capture-open"));
        return;
      }

      // Alternate opener for command palette on external keyboards.
      if ((e.metaKey || e.ctrlKey) && e.code === "Space") {
        if (isEditingTarget(t)) return;
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: e.metaKey, ctrlKey: e.ctrlKey }));
        return;
      }

      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== "n") return;
      if (t?.closest?.('[contenteditable="true"]')) return;
      if (isEditingTarget(t)) return;

      e.preventDefault();
      if (pathname === "/overview") {
        const el = document.getElementById("new-project-name");
        if (el) {
          el.focus();
          return;
        }
      }
      window.dispatchEvent(
        new CustomEvent("route5:new-project-open", { detail: { mode: "task" } })
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  const help =
    helpOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100010] flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-[min(8vh,64px)] backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-shortcuts-title"
            onClick={() => setHelpOpen(false)}
          >
            <div
              className="relative w-full max-w-[min(100%,440px)] rounded-[22px] border border-white/[0.12] bg-zinc-950/[0.94] p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06] backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="absolute right-3 top-3 rounded-xl p-2 text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100"
                aria-label="Close shortcuts"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>

              <div className="pr-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/90">
                  Route5
                </p>
                <h2 id="workspace-shortcuts-title" className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-zinc-50">
                  Keyboard shortcuts
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  Press{" "}
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.08] px-2 py-0.5 font-mono text-[11px] text-zinc-100">
                    ?
                  </kbd>{" "}
                  anytime (outside a text field) to open or close this sheet.
                </p>
                {platformNotes.length > 0 ? (
                  <ul className="mt-3 space-y-1.5 border-t border-white/[0.08] pt-3 text-[12px] leading-snug text-zinc-400">
                    {platformNotes.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400/80" aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-5 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.14] to-transparent px-4 py-3.5">
                <p className="text-[12px] font-semibold text-zinc-100">Search everything</p>
                <p className="mt-1.5 text-[12px] leading-snug text-zinc-300">
                  <kbd className="rounded-md border border-white/20 bg-black/35 px-1.5 py-0.5 font-mono text-[11px] text-[var(--workspace-fg)]">
                    {modLabel}K
                  </kbd>{" "}
                  opens the command palette — jump to Desk, Capture, Marketplace, Team, Settings, and more. Use{" "}
                  <kbd className="rounded border border-white/20 bg-black/35 px-1 py-0.5 font-mono text-[10px]">
                    ↑
                  </kbd>{" "}
                  <kbd className="rounded border border-white/20 bg-black/35 px-1 py-0.5 font-mono text-[10px]">
                    ↓
                  </kbd>{" "}
                  and{" "}
                  <kbd className="rounded-md border border-white/20 bg-black/35 px-1.5 py-0.5 font-mono text-[10px]">
                    Enter
                  </kbd>
                  .
                </p>
              </div>

              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Everywhere
              </p>
              <ul className="mt-2 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.03]">
                <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-zinc-200">Command palette</span>
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-[var(--workspace-fg)]">
                    {modLabel}K
                  </kbd>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-zinc-200">Capture panel</span>
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-[var(--workspace-fg)]">
                    {modLabel}J
                  </kbd>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-zinc-200">Updates &amp; digest</span>
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-[var(--workspace-fg)]">
                    {modLabel === "⌘" ? "⌘⇧U" : "Ctrl+Shift+U"}
                  </kbd>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-zinc-200">New company</span>
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-[var(--workspace-fg)]">
                    {modLabel}N
                  </kbd>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-zinc-200">Toggle sidebar</span>
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-[var(--workspace-fg)]">
                    {modLabel}\\
                  </kbd>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-zinc-200">This shortcuts sheet</span>
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-[var(--workspace-fg)]">
                    ?
                  </kbd>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-zinc-200">Palette (alternate)</span>
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-[var(--workspace-fg)]">
                    {modLabel}Space
                  </kbd>
                </li>
                <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[13px] font-medium text-zinc-200">Shortcuts sheet (alternate)</span>
                  <kbd className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-mono text-[11px] text-[var(--workspace-fg)]">
                    {modLabel}/
                  </kbd>
                </li>
              </ul>

              <p className="mt-4 text-center text-[12px] leading-relaxed text-zinc-500">
                <kbd className="rounded-md border border-white/12 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                  Esc
                </kbd>{" "}
                closes dialogs when focus allows.
              </p>
            </div>
          </div>,
          document.body
        )
      : null;

  return help;
}
