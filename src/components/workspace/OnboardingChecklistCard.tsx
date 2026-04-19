"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, X } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import type { OnboardingStep } from "@/lib/onboarding/progress-store";

const LABELS: Record<Exclude<OnboardingStep, "complete">, string> = {
  org_setup: "Organization",
  invite_team: "Invites",
  connect_integration: "Integrations",
  first_commitment: "First commitment",
};

/** Quick shortcuts — full wizard stays at /workspace/onboarding for deep steps. */
const STEP_HREF: Record<Exclude<OnboardingStep, "complete">, string> = {
  org_setup: "/workspace/onboarding",
  invite_team: "/workspace/onboarding",
  connect_integration: "/workspace/onboarding",
  first_commitment: "/workspace/commitments",
};

const STEP_KEYS: Exclude<OnboardingStep, "complete">[] = [
  "org_setup",
  "invite_team",
  "connect_integration",
  "first_commitment",
];

export default function OnboardingChecklistCard() {
  const pathname = usePathname();
  const exp = useWorkspaceExperience();
  const [data, setData] = useState<{ steps: Record<string, boolean> } | null>(null);

  useEffect(() => {
    if (exp.prefs.onboardingChecklistDismissed) return;
    if (pathname?.startsWith("/workspace/onboarding")) return;
    let cancelled = false;
    void fetch("/api/workspace/onboarding", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: { complete?: boolean; steps?: Record<string, boolean> }) => {
        if (cancelled) return;
        // API `complete` means the wizard is fully finished — show this card only while still in progress.
        if (j.complete) return;
        if (j.steps) setData({ steps: j.steps });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, exp.prefs.onboardingChecklistDismissed]);

  if (exp.prefs.onboardingChecklistDismissed || !data?.steps) return null;

  return (
    <div className="mt-3 shrink-0 px-0">
      <div className="rounded-xl border border-[var(--workspace-border)]/90 bg-[var(--workspace-surface)]/50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-[var(--workspace-fg)]">Quick start</p>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--workspace-muted-fg)]">
              Tap a step to open the right screen — no full-page wizard required.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-0.5 text-[var(--workspace-muted-fg)] transition hover:bg-[var(--workspace-nav-hover)] hover:text-[var(--workspace-fg)]"
            aria-label="Dismiss checklist"
            onClick={() => exp.setPrefs({ onboardingChecklistDismissed: true })}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {STEP_KEYS.map((k) => {
            const done = Boolean(data.steps[k]);
            const label = (
              <>
                <Check
                  className={`h-3.5 w-3.5 shrink-0 ${done ? "text-emerald-500" : "opacity-30"}`}
                  strokeWidth={2}
                  aria-hidden
                />
                {done ? (
                  <span className="text-[var(--workspace-muted-fg)]">{LABELS[k]}</span>
                ) : (
                  <Link
                    href={STEP_HREF[k]}
                    className="font-medium text-[var(--workspace-accent)] underline-offset-2 hover:underline"
                  >
                    {LABELS[k]}
                  </Link>
                )}
              </>
            );
            return (
              <li key={k} className="flex items-center gap-2 text-[11px]">
                {label}
              </li>
            );
          })}
        </ul>
        <Link
          href="/workspace/onboarding"
          className="mt-2 inline-block text-[10px] font-medium text-[var(--workspace-muted-fg)] underline-offset-2 hover:text-[var(--workspace-fg)] hover:underline"
        >
          Open full setup wizard
        </Link>
      </div>
    </div>
  );
}
