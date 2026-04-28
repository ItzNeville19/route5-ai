"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ExternalLink, Keyboard, LifeBuoy, Mail, MessageSquareWarning, Shield, UserRound, X } from "lucide-react";

export default function WorkspaceHelpPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => document.body.classList.add("overflow-hidden"), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    open ? (
      <>
        <button type="button" className="fixed inset-0 z-[278] bg-black/55 backdrop-blur-[2px]" aria-label="Close" onClick={onClose} />
        <aside
          className="fixed inset-y-0 right-0 z-[279] flex w-full max-w-[420px] flex-col border-l border-emerald-500/15 bg-[linear-gradient(180deg,#0a1210_0%,#070b09_100%)] shadow-[-24px_0_80px_-40px_rgba(16,185,129,0.35)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-panel-title"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-emerald-400/90" strokeWidth={1.75} />
              <h2 id="help-panel-title" className="text-[17px] font-semibold text-white">
                Help
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
              aria-label="Close help"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 text-[14px] leading-relaxed text-white/75">
            <section>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/85">
                <Keyboard className="h-3.5 w-3.5" />
                Shortcuts
              </p>
              <ul className="space-y-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-[13px]">
                <li className="flex justify-between gap-3">
                  <span className="text-white/55">Search everywhere</span>
                  <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-emerald-200/95">⌘K</kbd>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="text-white/55">Quick search</span>
                  <kbd className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-emerald-200/95">/</kbd>
                </li>
              </ul>
            </section>
            <section>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/85">
                <Shield className="h-3.5 w-3.5" />
                Team overview
              </p>
              <p className="text-[13px] text-white/65">
                For admins and managers: full team picture, Agent follow-ups, and open issues. Use{" "}
                <strong className="font-semibold text-white/90">Actions</strong> in the header for shortcuts (new task,
                run assistant, updates) when your role allows it.
              </p>
            </section>
            <section>
              <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/85">
                <UserRound className="h-3.5 w-3.5" />
                My work
              </p>
              <p className="text-[13px] text-white/65">
                Shows commitments assigned to you. Completed items stay in a collapsible section so open work stays clear.
              </p>
            </section>
            <section className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-[13px] font-medium text-white">Guides</p>
              <Link
                href="/workspace/help"
                onClick={onClose}
                className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Help center <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/docs/product"
                onClick={onClose}
                className="mt-2 block text-[13px] font-medium text-emerald-400/90 hover:text-emerald-300"
              >
                Product overview →
              </Link>
            </section>
            <section className="flex flex-wrap gap-3 border-t border-white/10 pt-4">
              <a
                href="mailto:support@route5.ai"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white/90 hover:border-emerald-500/35"
              >
                <Mail className="h-4 w-4" />
                Contact support
              </a>
              <a
                href="mailto:support@route5.ai?subject=Route%205%20issue"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/55 hover:border-amber-500/25 hover:text-white/85"
              >
                <MessageSquareWarning className="h-4 w-4" />
                Report an issue
              </a>
            </section>
          </div>
        </aside>
      </>
    ) : null,
    document.body
  );
}
