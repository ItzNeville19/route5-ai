"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import {
  NOTIFICATION_TYPES,
  type NotificationPreferenceRow,
  type NotificationType,
} from "@/lib/notifications/types";

const COPY: Record<NotificationType, { title: string; description: string }> = {
  commitment_assigned: {
    title: "Commitment assigned",
    description: "When you are assigned or reassigned an org commitment.",
  },
  commitment_due_soon: {
    title: "Due soon",
    description: "Reminders at 72h, 48h, and 24h before the deadline.",
  },
  commitment_overdue: {
    title: "Commitment overdue",
    description: "When a commitment passes its deadline.",
  },
  escalation_fired: {
    title: "Escalation fired",
    description: "When an escalation is created for a commitment.",
  },
  escalation_escalated: {
    title: "Escalation escalated",
    description: "When an issue is escalated to a manager or admin.",
  },
  payment_failed: {
    title: "Payment failed",
    description: "When subscription payment cannot be processed.",
  },
  subscription_cancelled: {
    title: "Subscription cancelled",
    description: "When your paid plan ends or is cancelled.",
  },
  trial_ending: {
    title: "Trial ending",
    description: "Before your trial period ends.",
  },
  team_invited: {
    title: "Team invited",
    description: "When someone invites you to a workspace.",
  },
  daily_morning_digest: {
    title: "Morning digest",
    description: "Personalized 8:00 AM daily digest for due today, overdue, and at-risk work.",
  },
  weekly_summary: {
    title: "Weekly summary",
    description: "Executive summary of commitments and execution.",
  },
};

function Toggle({
  pressed,
  onPress,
  disabled,
  label,
}: {
  pressed: boolean;
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      title={disabled ? "Connect Slack under Workspace → Integrations to enable." : undefined}
      aria-pressed={pressed}
      aria-label={label}
      className={`relative h-7 w-11 shrink-0 rounded-full border transition ${
        disabled
          ? "cursor-not-allowed border-white/10 bg-zinc-900/80 opacity-50"
          : pressed
            ? "border-violet-500/50 bg-violet-600/35"
            : "border-white/15 bg-zinc-900/80 hover:border-white/25"
      }`}
    >
      <span
        className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition ${
          pressed ? "left-[calc(100%-14px)]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationPreferencesPage() {
  const { pushToast } = useWorkspaceExperience();
  const [loading, setLoading] = useState(true);
  const [slackConnected, setSlackConnected] = useState(false);
  const [rows, setRows] = useState<NotificationPreferenceRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/preferences", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        preferences?: NotificationPreferenceRow[];
        slackConnected?: boolean;
        error?: string;
      };
      if (res.ok && data.preferences) {
        setRows(data.preferences);
        setSlackConnected(Boolean(data.slackConnected));
      } else {
        pushToast(data.error ?? "Could not load preferences", "error");
      }
    } catch {
      pushToast("Could not load preferences", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePatch(
    type: NotificationType,
    patch: Partial<{ inApp: boolean; email: boolean; slack: boolean }>
  ) {
    const row = rows.find((r) => r.type === type);
    if (!row) return;
    const next = {
      type,
      inApp: patch.inApp ?? row.inApp,
      email: patch.email ?? row.email,
      slack: patch.slack ?? row.slack,
    };
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: [next] }),
      });
      if (!res.ok) {
        pushToast("Could not save", "error");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.type === type ? { ...r, ...patch } : r))
      );
      pushToast("Saved", "success");
    } catch {
      pushToast("Could not save", "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-zinc-400 transition hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Settings
      </Link>
      <h1 className="text-xl font-semibold text-[var(--workspace-fg)]">Notification preferences</h1>
      <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
        Choose how you want to be notified for each event. In-app alerts appear in the workspace bell.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          <div>Type</div>
          <div className="text-center">In-app</div>
          <div className="text-center">Email</div>
          <div className="text-center">Slack</div>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-[13px] text-zinc-400">Loading…</p>
        ) : (
          NOTIFICATION_TYPES.map((type) => {
            const row = rows.find((r) => r.type === type);
            const copy = COPY[type];
            const inApp = row?.inApp ?? true;
            const email = row?.email ?? true;
            const slack = row?.slack ?? true;
            return (
              <div
                key={type}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-white/[0.06] px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--workspace-fg)]">{copy.title}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">{copy.description}</p>
                </div>
                <div className="flex justify-center">
                  <Toggle
                    label={`In-app ${copy.title}`}
                    pressed={inApp}
                    onPress={() => void savePatch(type, { inApp: !inApp })}
                  />
                </div>
                <div className="flex justify-center">
                  <Toggle
                    label={`Email ${copy.title}`}
                    pressed={email}
                    onPress={() => void savePatch(type, { email: !email })}
                  />
                </div>
                <div className="flex justify-center">
                  <Toggle
                    label={`Slack ${copy.title}`}
                    pressed={slack}
                    disabled={!slackConnected}
                    onPress={() => void savePatch(type, { slack: !slack })}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      {!slackConnected ? (
        <p className="mt-4 text-[12px] text-zinc-500">
          Connect Slack in{" "}
          <Link href="/workspace/integrations" className="text-[var(--workspace-accent)] hover:underline">
            Workspace → Integrations
          </Link>{" "}
          to enable Slack notifications.
        </p>
      ) : null}
    </div>
  );
}
