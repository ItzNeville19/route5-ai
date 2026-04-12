"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
};

export default function DeskShortcutsModal({ open, onClose, t }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="desk-shortcuts-title"
        className="relative z-[1] w-full max-w-md rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="desk-shortcuts-title" className="text-[16px] font-semibold text-[var(--workspace-fg)]">
            {t("desk.shortcuts.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)] hover:text-[var(--workspace-fg)]"
            aria-label={t("desk.shortcuts.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="mt-4 space-y-3 text-[13px] text-[var(--workspace-muted-fg)]">
          <li className="flex justify-between gap-4">
            <span>{t("desk.shortcuts.run")}</span>
            <kbd className="shrink-0 rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2 py-0.5 font-mono text-[11px] text-[var(--workspace-fg)]">
              ⌘ Enter
            </kbd>
          </li>
          <li className="flex justify-between gap-4">
            <span>{t("desk.shortcuts.palette")}</span>
            <kbd className="shrink-0 rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2 py-0.5 font-mono text-[11px] text-[var(--workspace-fg)]">
              ⌘ K
            </kbd>
          </li>
          <li className="flex justify-between gap-4">
            <span>{t("desk.shortcuts.escape")}</span>
            <kbd className="shrink-0 rounded border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-2 py-0.5 font-mono text-[11px] text-[var(--workspace-fg)]">
              Esc
            </kbd>
          </li>
        </ul>
        <p className="mt-4 text-[12px] leading-relaxed text-[var(--workspace-muted-fg)]">
          {t("desk.shortcuts.footer")}
        </p>
      </div>
    </div>
  );
}
