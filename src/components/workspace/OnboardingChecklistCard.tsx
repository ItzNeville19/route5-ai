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
        if (j.complete && j.steps) setData({ steps: j.steps });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, exp.prefs.onboardingChecklistDismissed]);

  if (exp.prefs.onboardingChecklistDismissed || !data?.steps) return null;

  return (
    <div className="mt-2 shrink-0 px-3">
      <div className="rounded-xl border border-[var(--workspace-border)]/90 bg-[var(--workspace-surface)]/50 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold text-[var(--workspace-fg)]">Setup checklist</p>
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
          {STEP_KEYS.map((k) => (
            <li key={k} className="flex items-center gap-2 text-[11px] text-[var(--workspace-muted-fg)]">
              <Check
                className={`h-3.5 w-3.5 shrink-0 ${data.steps[k] ? "text-emerald-500" : "opacity-30"}`}
                strokeWidth={2}
                aria-hidden
              />
              {LABELS[k]}
            </li>
          ))}
        </ul>
        <Link
          href="/workspace/onboarding"
          className="mt-2 inline-block text-[10px] font-semibold text-[var(--workspace-accent)] hover:underline"
        >
          Review setup
        </Link>
      </div>
    </div>
  );
}
