"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Check, ChevronRight } from "lucide-react";
import OnboardingProductTour from "@/components/onboarding/OnboardingProductTour";
import { useOnboardingFlow } from "@/components/onboarding/OnboardingFlowContext";
import WorkspaceThemeSection from "@/components/workspace/WorkspaceThemeSection";
import { markOnboardingComplete } from "@/lib/onboarding-storage";
import {
  loadWorkspacePrefs,
  mergeWorkspacePrefsPatch,
  saveWorkspacePrefs,
} from "@/lib/workspace-prefs";

const STEP_LABELS = [
  "Organization",
  "Tour",
  "Theme",
  "Team invites",
  "Integrations",
  "First commitment",
  "Done",
] as const;

const TOTAL = STEP_LABELS.length;

function saveOrgDashboardNote(orgName: string) {
  const org = orgName.trim() || "Your organization";
  saveWorkspacePrefs(
    mergeWorkspacePrefsPatch(loadWorkspacePrefs(), {
      dashboardCompanyNote: `${org} — commitments tracked in Feed.`,
      companyPresetId: "custom",
    })
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("route5:workspace-prefs-changed"));
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { orgName, setOrgName } = useOnboardingFlow();
  const replay = searchParams.get("replay") === "1";

  const [step, setStep] = useState(0);
  const [invites, setInvites] = useState("");

  useEffect(() => {
    if (replay) setStep(0);
  }, [replay]);

  const firstName = useMemo(
    () => user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "there",
    [user]
  );

  function finishOnboarding() {
    saveOrgDashboardNote(orgName);
    if (user?.id) markOnboardingComplete(user.id);
    router.push("/feed");
  }

  const canContinue = (() => {
    if (step === 0) return orgName.trim().length > 1;
    return true;
  })();

  function goNext() {
    if (step === 0) {
      saveOrgDashboardNote(orgName);
    }
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  }

  return (
    <div className="mx-auto w-full max-w-[800px] space-y-[var(--r5-space-5)] pb-[var(--r5-space-8)]">
      <header className="space-y-[var(--r5-space-3)]">
        <div className="sticky top-0 z-10 -mx-4 border-b border-r5-border-subtle/70 bg-r5-surface-secondary/85 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-r5-text-secondary">
            Route5 workspace ·{" "}
            <span className="text-r5-text-primary">
              {orgName.trim() || "Your company"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[length:var(--r5-font-subheading)] text-r5-text-primary">
            Welcome, <span className="font-semibold">{firstName}</span>
            {replay ? (
              <span className="ml-2 rounded-full border border-r5-border-subtle bg-r5-surface-secondary/60 px-2 py-0.5 text-[11px] font-medium text-r5-text-secondary">
                Tutorial replay
              </span>
            ) : null}
          </p>
          <Link
            href="/feed"
            className="text-[length:var(--r5-font-body)] text-r5-text-secondary transition hover:text-r5-text-primary"
          >
            Skip to Feed
          </Link>
        </div>
        <div className="flex items-center gap-[var(--r5-space-2)] overflow-x-auto pb-1" aria-label="Onboarding progress">
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className="min-w-[72px] flex-1">
              <div
                className={`h-1.5 rounded-[var(--r5-radius-pill)] transition-colors ${
                  idx <= step ? "bg-r5-accent" : "bg-r5-border-subtle"
                }`}
              />
              <p className="mt-[var(--r5-space-1)] truncate text-[length:var(--r5-font-kbd)] text-r5-text-secondary">
                {idx + 1}. {label}
              </p>
            </div>
          ))}
        </div>
      </header>

      {step === 2 ? (
        <WorkspaceThemeSection />
      ) : (
        <section className="rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-5)] shadow-[var(--r5-shadow-elevated)]">
          {step === 0 ? (
            <div className="space-y-[var(--r5-space-4)]">
              <h1 className="text-[length:var(--r5-font-heading)] font-semibold text-r5-text-primary">
                Name your organization
              </h1>
              <p className="text-[length:var(--r5-font-body)] text-r5-text-secondary">
                We show this in greetings, Overview, and your dashboard note. You can change themes and layout anytime
                under Customize — same controls as the next step.
              </p>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Leadership Team"
                autoComplete="organization"
                className="w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-3)] py-[var(--r5-space-3)] text-[length:var(--r5-font-subheading)] text-r5-text-primary placeholder:text-r5-text-secondary"
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-[var(--r5-space-5)]">
              <div>
                <h1 className="text-[length:var(--r5-font-heading)] font-semibold text-r5-text-primary">
                  See how Route5 fits your week
                </h1>
                <p className="mt-2 text-[length:var(--r5-font-body)] text-r5-text-secondary">
                  A quick, interactive tour — no video, no tab hopping.
                </p>
              </div>
              <OnboardingProductTour />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-[var(--r5-space-4)]">
              <h1 className="text-[length:var(--r5-font-heading)] font-semibold text-r5-text-primary">
                Invite team members
              </h1>
              <p className="text-[length:var(--r5-font-body)] text-r5-text-secondary">
                Optional — paste emails separated by commas. You can also send invites later from Team.
              </p>
              <textarea
                value={invites}
                onChange={(e) => setInvites(e.target.value)}
                placeholder="alex@company.com, sam@company.com"
                rows={4}
                className="w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-3)] py-[var(--r5-space-3)] text-[length:var(--r5-font-subheading)] text-r5-text-primary placeholder:text-r5-text-secondary"
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-[var(--r5-space-4)]">
              <h1 className="text-[length:var(--r5-font-heading)] font-semibold text-r5-text-primary">
                Connect your stack
              </h1>
              <p className="text-[length:var(--r5-font-subheading)] text-r5-text-secondary">
                Open Integrations to see what&apos;s live, paste-based flows, and OAuth where available. Themes and
                layout live under Customize.
              </p>
              <div className="flex flex-wrap gap-[var(--r5-space-2)]">
                <button
                  type="button"
                  onClick={() => router.push("/integrations")}
                  className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-text-primary px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-surface-primary transition hover:opacity-95"
                >
                  Open Integrations
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/workspace/customize")}
                  className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/60 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover"
                >
                  Customize
                </button>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-[var(--r5-space-4)]">
              <h1 className="text-[length:var(--r5-font-heading)] font-semibold text-r5-text-primary">
                Create your first commitment
              </h1>
              <p className="text-[length:var(--r5-font-subheading)] text-r5-text-secondary">
                Open Capture and paste meeting notes, Slack, or email — we&apos;ll extract structured commitments.
              </p>
              <div className="flex flex-wrap gap-[var(--r5-space-2)]">
                <button
                  type="button"
                  onClick={() => router.push("/feed")}
                  className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-[var(--r5-space-2)] rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-surface-primary"
                >
                  Continue to Feed
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
                <p className="w-full text-[length:var(--r5-font-body)] text-r5-text-tertiary">
                  On Feed, press{" "}
                  <kbd className="rounded border border-r5-border-subtle bg-r5-surface-secondary/80 px-1 font-mono text-[12px]">
                    ⌘J
                  </kbd>{" "}
                  or tap Capture to paste your first note.
                </p>
              </div>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="space-y-[var(--r5-space-4)]">
              <h1 className="text-[length:var(--r5-font-heading)] font-semibold text-r5-text-primary">
                You&apos;re ready
              </h1>
              <p className="text-[length:var(--r5-font-subheading)] text-r5-text-secondary">
                Your theme and organization are saved. Use{" "}
                <kbd className="rounded border border-r5-border-subtle bg-r5-surface-secondary/80 px-1 font-mono text-[12px]">
                  ⌘K
                </kbd>{" "}
                to open Desk, Overview, Marketplace, and more any time — they don&apos;t clutter the sidebar.
              </p>
              <button
                type="button"
                onClick={finishOnboarding}
                className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-[var(--r5-space-2)] rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-surface-primary"
              >
                <Check className="h-4 w-4" aria-hidden />
                Go to Feed
              </button>
            </div>
          ) : null}
        </section>
      )}

      {step < TOTAL - 1 ? (
        <div className="flex items-center justify-end gap-[var(--r5-space-2)]">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-secondary"
            >
              Back
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canContinue}
            onClick={goNext}
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-[var(--r5-space-2)] rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-surface-primary disabled:opacity-50"
          >
            Continue
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
