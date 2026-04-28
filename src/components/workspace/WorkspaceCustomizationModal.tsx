"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import CommandCenterCustomizeSection from "@/components/workspace/CommandCenterCustomizeSection";
import WorkspaceThemeSection from "@/components/workspace/WorkspaceThemeSection";

export default function WorkspaceCustomizationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    open ? (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[280] bg-black/55 backdrop-blur-[2px]"
          aria-label="Close"
          onClick={onClose}
        />
        <div
          className="fixed left-1/2 top-[max(2rem,5vh)] z-[281] flex max-h-[min(92vh,920px)] w-[min(100vw-1.5rem,580px)] -translate-x-1/2 flex-col overflow-hidden rounded-[22px] border border-[var(--workspace-border)] bg-[var(--workspace-surface)] shadow-[0_40px_120px_-48px_rgba(0,0,0,0.85)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customize-modal-title"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--workspace-border)] px-5 py-4">
            <h2 id="customize-modal-title" className="text-[17px] font-semibold tracking-tight text-[var(--workspace-fg)]">
              Customize workspace
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--workspace-border)] p-2 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-canvas)] hover:text-[var(--workspace-fg)]"
              aria-label="Close customization"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-2">
            <WorkspaceThemeSection />
            <CommandCenterCustomizeSection />
            <p className="px-3 pb-2 text-center text-[12px] text-[var(--workspace-muted-fg)]">
              <Link
                href="/workspace/customize#appearance"
                className="font-medium text-[var(--workspace-accent)] underline-offset-2 hover:underline"
                onClick={onClose}
              >
                Open full customize page
              </Link>
            </p>
          </div>
        </div>
      </>
    ) : null,
    document.body
  );
}
