"use client";

import Link from "next/link";
import { Figma, LayoutGrid, Sparkles } from "lucide-react";

export default function FigmaIntegrationPage() {
  return (
    <div className="mx-auto max-w-[800px] pb-24">
      <Link
        href="/integrations"
        className="text-[13px] font-medium text-[var(--workspace-muted-fg)] hover:text-[var(--workspace-fg)]"
      >
        ← Integrations
      </Link>
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--workspace-surface)] shadow-sm ring-1 ring-black/[0.05] dark:ring-white/10">
            <Figma className="h-6 w-6 text-[var(--workspace-fg)]" aria-hidden />
          </span>
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
              Figma
            </h1>
            <p className="mt-1 text-[14px] text-[var(--workspace-muted-fg)]">
              Paste file links and feedback — run structured design reviews on your desk.
            </p>
          </div>
        </div>

        <div className="dashboard-pro-card mt-8 p-6 sm:p-7">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--workspace-muted-fg)]">
            How it works
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-[14px] leading-relaxed text-[var(--workspace-fg)]">
            <li>
              In Figma: copy comments, sticky notes, or a short description of frames you care about.
            </li>
            <li>
              On your{" "}
              <Link href="/desk?preset=design" className="font-semibold text-[var(--workspace-accent)] hover:underline">
                Desk
              </Link>
              , pick a project and paste everything into capture — or start from the Design template.
            </li>
            <li>Run extraction for decisions, actions, and a clean handoff.</li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://www.figma.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
            >
              Open Figma
            </a>
            <Link
              href="/desk?preset=design"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--workspace-fg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-canvas)] shadow-md transition hover:opacity-95"
            >
              Design review on Desk
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-[13px]">
          <Link
            href="/marketplace/figma"
            className="inline-flex items-center gap-2 font-medium text-[var(--workspace-accent)] hover:underline"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Marketplace listing
          </Link>
          <Link href="/desk" className="inline-flex items-center gap-2 font-medium text-[var(--workspace-muted-fg)] hover:text-[var(--workspace-fg)]">
            <Sparkles className="h-4 w-4" aria-hidden />
            Full desk
          </Link>
        </div>
      </div>
    </div>
  );
}
