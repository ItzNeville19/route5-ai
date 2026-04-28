"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { X } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";

const STEPS = [
  {
    title: "Home",
    body: "Your command center — commitments, health, and jump links start here. Use the toolbar Home tab anytime.",
  },
  {
    title: "Agent",
    body: "Scan commitments, approve outreach, and keep deadlines moving — AI-assisted suggestions at each step.",
  },
  {
    title: "History",
    body: "Audit trail of workspace activity so Dashboard, Agent, and History stay aligned.",
  },
  {
    title: "Customize",
    body: "Theme, density, and canvas match Route5 to how you work — preferences sync to your account.",
  },
] as const;

function clerkPublicMetadataSkipsTour(user: ReturnType<typeof useUser>["user"]): boolean {
  const m = user?.publicMetadata;
  if (!m || typeof m !== "object" || Array.isArray(m)) return false;
  const o = m as Record<string, unknown>;
  if (o.route5GuidedTourCompleted === true) return true;
  if (o.route5SkipWorkspaceTour === true) return true;
  return false;
}

function tourSuppressedByPrefs(prefs: {
  guidedTourCompleted?: boolean;
  onboardingChecklistDismissed?: boolean;
}): boolean {
  if (prefs.guidedTourCompleted === true) return true;
  if (prefs.onboardingChecklistDismissed === true) return true;
  return false;
}

/**
 * First-run guided tour (prefs `guidedTourCompleted`), or replay via `?tour=1` / `route5:replay-guided-tour`.
 */
export default function WorkspaceInteractiveTour() {
  const { prefs, setPrefs, workspacePrefsRemoteReady } = useWorkspaceExperience();
  const { user, isLoaded: userLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  /** User opened tour from Help or URL — do not auto-close when prefs say “already completed.” */
  const [manualReplay, setManualReplay] = useState(false);

  const shouldOfferTour = useMemo(() => {
    if (!userLoaded || !workspacePrefsRemoteReady) return false;
    if (tourSuppressedByPrefs(prefs)) return false;
    if (clerkPublicMetadataSkipsTour(user)) return false;
    return true;
  }, [userLoaded, workspacePrefsRemoteReady, prefs, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("tour") !== "1") return;
    setManualReplay(true);
    setOpen(true);
    setStep(0);
    q.delete("tour");
    const next = pathname + (q.toString() ? `?${q}` : "");
    router.replace(next, { scroll: false });
  }, [pathname, router]);

  useEffect(() => {
    const ev = () => {
      setManualReplay(true);
      setOpen(true);
      setStep(0);
    };
    window.addEventListener("route5:replay-guided-tour", ev);
    return () => window.removeEventListener("route5:replay-guided-tour", ev);
  }, []);

  useEffect(() => {
    if (manualReplay) return;
    if (shouldOfferTour) {
      setOpen(true);
      return;
    }
    setOpen(false);
    setStep(0);
  }, [shouldOfferTour, manualReplay]);

  const done = useCallback(() => {
    setPrefs({ guidedTourCompleted: true });
    setOpen(false);
    setManualReplay(false);
  }, [setPrefs]);

  const current = useMemo(() => STEPS[step], [step]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
      style={{
        paddingTop: "max(1rem, calc(1rem + env(safe-area-inset-top, 0px)))",
        paddingBottom: "max(1rem, calc(1rem + env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Dismiss tour"
        onClick={done}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="route5-tour-title"
        className="relative z-[201] w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0a1214]/98 p-5 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.95)] backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/45">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 id="route5-tour-title" className="mt-2 text-lg font-semibold text-white">
              {current.title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/58">{current.body}</p>
          </div>
          <button
            type="button"
            onClick={done}
            className="route5-pressable shrink-0 rounded-full p-1 text-white/45 hover:bg-white/[0.06] hover:text-white"
            aria-label="Skip tour"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="text-[12px] font-medium text-white/45 hover:text-white/75"
            onClick={done}
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                className="rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] font-semibold text-white/80 hover:bg-white/[0.05]"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="rounded-full bg-cyan-500/90 px-4 py-1.5 text-[12px] font-semibold text-[#041016] shadow-[0_8px_24px_-12px_rgba(34,211,238,0.55)] hover:bg-cyan-400"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="rounded-full bg-emerald-500/90 px-4 py-1.5 text-[12px] font-semibold text-[#041016] shadow-[0_8px_24px_-12px_rgba(52,211,153,0.45)] hover:bg-emerald-400"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("route5:open-customize"));
                  done();
                }}
              >
                Open customize & finish
              </button>
            )}
          </div>
        </div>
        {step === STEPS.length - 1 ? (
          <p className="mt-4 text-[11px] text-white/38">
            Or jump manually:{" "}
            <Link href="/workspace/customize" className="font-medium text-cyan-200/85 underline-offset-2 hover:underline">
              Workspace customize
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
