"use client";

import {
  ClipboardPaste,
  Copy,
  Download,
  Eraser,
  Keyboard,
  Type,
} from "lucide-react";

type Props = {
  disabled: boolean;
  wordCount: number;
  readMinutes: number;
  onPaste: () => void;
  onCopy: () => void;
  onClear: () => void;
  onExport: () => void;
  onShortcuts: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

export default function DeskCaptureToolbar({
  disabled,
  wordCount,
  readMinutes,
  onPaste,
  onCopy,
  onClear,
  onExport,
  onShortcuts,
  t,
}: Props) {
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--workspace-border)] pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--workspace-muted-fg)]">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-2 py-0.5 tabular-nums">
          <Type className="h-3 w-3 opacity-70" aria-hidden />
          {t("desk.toolbar.words", { count: wordCount })}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/60 px-2 py-0.5 tabular-nums">
          {wordCount === 0
            ? t("desk.toolbar.readPending")
            : t("desk.toolbar.readTime", { minutes: readMinutes })}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={onPaste}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-40"
        >
          <ClipboardPaste className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t("desk.toolbar.paste")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-40"
        >
          <Copy className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t("desk.toolbar.copy")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-40"
        >
          <Eraser className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t("desk.toolbar.clear")}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onExport}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-2 py-1.5 text-[11px] font-semibold text-[var(--workspace-fg)] transition hover:border-[var(--workspace-accent)]/35 disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t("desk.toolbar.export")}
        </button>
        <button
          type="button"
          onClick={onShortcuts}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/80 px-2 py-1.5 text-[11px] font-semibold text-[var(--workspace-muted-fg)] transition hover:border-[var(--workspace-accent)]/35 hover:text-[var(--workspace-fg)]"
        >
          <Keyboard className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t("desk.toolbar.shortcuts")}
        </button>
      </div>
    </div>
  );
}
