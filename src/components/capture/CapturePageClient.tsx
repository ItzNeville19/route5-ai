"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { useCapture } from "@/components/capture/CaptureProvider";

/** Opens the floating capture panel when you land on /capture (same as ⌘J). */
export default function CapturePageClient() {
  const { open } = useCapture();
  const openedOnce = useRef(false);

  useEffect(() => {
    if (openedOnce.current) return;
    openedOnce.current = true;
    open();
  }, [open]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-lg flex-col items-center justify-center px-6 pb-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--workspace-accent)]/30 bg-[var(--workspace-accent)]/10">
        <ListChecks className="h-8 w-8 text-[var(--workspace-accent)]" strokeWidth={1.5} aria-hidden />
      </div>
      <h1 className="text-[22px] font-semibold tracking-tight text-[var(--workspace-fg)]">Capture</h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Paste meeting notes or threads in the panel to extract commitments. If you don&apos;t see it, use the
        button below or{" "}
        <kbd className="rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-1.5 py-0.5 font-mono text-[11px]">
          ⌘J
        </kbd>
        .
      </p>
      <button
        type="button"
        onClick={() => open()}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--workspace-fg)] px-8 py-3 text-[14px] font-semibold text-[var(--workspace-canvas)] shadow-lg transition hover:opacity-95"
      >
        <ListChecks className="h-4 w-4" strokeWidth={2} aria-hidden />
        Open capture panel
      </button>
      <p className="mt-6 text-[12px] text-[var(--workspace-muted-fg)]">
        Tip: press{" "}
        <kbd className="rounded-md border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-1.5 py-0.5 font-mono text-[11px]">
          ⌘J
        </kbd>{" "}
        from anywhere in the workspace.
      </p>
      <Link
        href="/desk"
        className="mt-10 text-[14px] font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
      >
        ← Back to Desk
      </Link>
    </div>
  );
}
