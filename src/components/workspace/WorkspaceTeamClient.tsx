"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { OrganizationSwitcher, useOrganization, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, MailPlus, Sparkles, Users, X } from "lucide-react";
import { ROUTE5_SIGNATURE } from "@/lib/brand-signature";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { formatRelativeLong } from "@/lib/relative-time";

/** Dark surface + light text so Clerk popover never inherits global light theme with washed-out labels. */
const ORG_SWITCHER_APPEARANCE = {
  variables: {
    colorPrimary: "#a78bfa",
    colorForeground: "#0f172a",
    colorMutedForeground: "#475569",
    colorBackground: "#ffffff",
    colorInput: "#f8fafc",
    colorInputForeground: "#0f172a",
    colorNeutral: "#cbd5e1",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "flex items-center",
    organizationSwitcherTrigger:
      "rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-3 py-2 text-[length:var(--r5-font-body)] text-r5-text-primary hover:bg-r5-surface-hover",
    organizationSwitcherPopoverCard:
      "!bg-slate-950 !text-slate-100 border border-slate-600/80 shadow-2xl",
    organizationSwitcherPopoverMain: "!text-slate-100",
    organizationSwitcherPopoverActionButton:
      "!text-slate-100 hover:!bg-slate-800 rounded-lg",
    organizationPreviewMainIdentifier: "!text-r5-text-primary",
    organizationPreviewSecondaryIdentifier: "!text-r5-text-secondary",
    organizationSwitcherPopoverFooter: "border-t border-slate-700 !bg-slate-950",
    organizationSwitcherPopoverRootBox: "text-slate-100",
  },
} as const;

type WorkspaceCollaboratorRow = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string | null;
  primaryEmail: string | null;
};

function displayName(c: WorkspaceCollaboratorRow): string {
  const parts = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (parts) return parts;
  if (c.username) return c.username;
  if (c.primaryEmail) return c.primaryEmail;
  return c.userId;
}

export default function WorkspaceTeamClient() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { summary, entitlements, loadingSummary } = useWorkspaceData();
  const [rows, setRows] = useState<WorkspaceCollaboratorRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invitesText, setInvitesText] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const enterprise = entitlements?.tier === "enterprise";

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/workspace/collaborators", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        collaborators?: WorkspaceCollaboratorRow[];
        error?: string;
      };
      if (!res.ok) {
        setRows(null);
        setError(data.error ?? "Could not load team.");
        return;
      }
      setRows(data.collaborators ?? []);
    } catch {
      setRows(null);
      setError("Could not load team.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!inviteModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInviteModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inviteModalOpen]);

  const parsedInviteEmails = useMemo(
    () =>
      invitesText
        .split(/[\n,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i),
    [invitesText]
  );

  async function sendInvites() {
    if (parsedInviteEmails.length === 0) {
      setInviteMessage("Add at least one email address.");
      return;
    }
    setInviteBusy(true);
    setInviteMessage(null);
    try {
      const seatRes = await fetch("/api/billing/invite", {
        method: "POST",
        credentials: "same-origin",
      });
      if (seatRes.status === 409) {
        setInviteMessage("Seat limit reached for your current plan. Upgrade in Billing to invite more teammates.");
        return;
      }
      const res = await fetch("/api/workspace/onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite_team", emails: parsedInviteEmails }),
      });
      if (!res.ok) {
        setInviteMessage("Could not send invites right now.");
        return;
      }
      setInviteMessage(`Invites sent to ${parsedInviteEmails.length} teammate${parsedInviteEmails.length === 1 ? "" : "s"}.`);
      setInvitesText("");
      setInviteModalOpen(false);
    } catch {
      setInviteMessage("Could not send invites right now.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function copyInviteLink() {
    try {
      const base = typeof window === "undefined" ? "" : window.location.origin;
      const shareInviteLink = `${base}/sign-up?redirect_url=${encodeURIComponent("/feed")}`;
      await navigator.clipboard.writeText(shareInviteLink);
      setInviteMessage("Invite link copied. Share it with your team.");
    } catch {
      setInviteMessage("Could not copy invite link.");
    }
  }

  function openMailtoInvites() {
    if (parsedInviteEmails.length === 0) {
      setInviteMessage("Add at least one email in the box first.");
      return;
    }
    const orgLabel = organization?.name ?? "Route5";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const subject = encodeURIComponent(`You're invited to ${orgLabel} on Route5`);
    const body = encodeURIComponent(
      `Hi,\n\nI'm inviting you to collaborate on ${orgLabel} in Route5.\n\nJoin here: ${origin}/sign-up\n\n`
    );
    const list = parsedInviteEmails.map(encodeURIComponent).join(",");
    window.location.href = `mailto:${list}?subject=${subject}&body=${body}`;
  }

  const inviteModal =
    typeof document !== "undefined" && inviteModalOpen
      ? createPortal(
          <AnimatePresence>
            <motion.div
              role="presentation"
              className="fixed inset-0 z-[120] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/65 backdrop-blur-[3px]"
                aria-label="Close invite dialog"
                onClick={() => setInviteModalOpen(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="invite-modal-title"
                initial={{ opacity: 0, y: 16, rotateX: -6 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative z-[1] w-full max-w-lg rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/95 p-[var(--r5-space-5)] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.75)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      id="invite-modal-title"
                      className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary"
                    >
                      Invite teammates
                    </p>
                    <p className="mt-1 text-[length:var(--r5-font-body)] text-r5-text-secondary">
                      We&apos;ll email each address with a secure sign-up link to this workspace. Seats follow your plan —
                      adjust capacity under Billing.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-r5-text-tertiary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
                    onClick={() => setInviteModalOpen(false)}
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <textarea
                  value={invitesText}
                  onChange={(e) => setInvitesText(e.target.value)}
                  placeholder="alex@company.com, sam@company.com"
                  rows={5}
                  className="mt-4 w-full rounded-[var(--r5-radius-md)] border border-r5-border-subtle bg-r5-surface-primary px-[var(--r5-space-3)] py-[var(--r5-space-3)] text-[length:var(--r5-font-subheading)] text-r5-text-primary placeholder:text-r5-text-secondary"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={inviteBusy}
                    onClick={() => void sendInvites()}
                    className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-2 rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-surface-primary disabled:opacity-50"
                  >
                    <MailPlus className="h-4 w-4" aria-hidden />
                    {inviteBusy ? "Sending…" : "Send email invites"}
                  </button>
                  <button
                    type="button"
                    onClick={openMailtoInvites}
                    className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover"
                  >
                    Open in mail app
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-[var(--r5-space-6)] pb-[var(--r5-space-8)]">
      {inviteModal}

      <div>
        <Link
          href="/feed"
          className="text-[length:var(--r5-font-body)] text-r5-text-secondary transition hover:text-r5-text-primary"
        >
          ← Feed
        </Link>
        <p className="mt-[var(--r5-space-3)] text-[length:var(--r5-font-caption)] font-semibold uppercase tracking-[0.14em] text-r5-text-tertiary">
          Collaboration
        </p>
        <h1 className="mt-2 text-[clamp(1.35rem,3.5vw,1.75rem)] font-semibold tracking-[-0.03em] text-r5-text-primary">
          Team
        </h1>
        <p className="mt-[var(--r5-space-2)] max-w-xl text-[length:var(--r5-font-subheading)] leading-relaxed text-r5-text-secondary">
          {ROUTE5_SIGNATURE.story} People listed here own at least one commitment in this workspace — profiles come from
          Clerk.
        </p>
      </div>

      <section className="r5-float-card rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-4)] shadow-[var(--r5-shadow-elevated)]">
        <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">Organization (Clerk)</h2>
        <p className="mt-1 text-[length:var(--r5-font-body)] text-r5-text-secondary">
          Roles, membership, and the <strong className="font-medium text-r5-text-primary">Manage</strong> control open in a
          Clerk panel — no extra page to configure. Switch orgs here; billing stays under Workspace → Billing.
        </p>
        <div className="clerk-org-switcher-host mt-[var(--r5-space-3)] flex flex-wrap items-center gap-3">
          <OrganizationSwitcher
            hidePersonal={false}
            afterCreateOrganizationUrl="/workspace/team"
            afterSelectOrganizationUrl="/feed"
            organizationProfileMode="modal"
            createOrganizationMode="modal"
            appearance={ORG_SWITCHER_APPEARANCE}
          />
        </div>
      </section>

      <section className="r5-float-card rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-4)] shadow-[var(--r5-shadow-elevated)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">Invite teammates</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-r5-border-subtle bg-r5-surface-primary/50 px-2 py-0.5 text-[11px] text-r5-text-secondary">
            {enterprise ? (
              <>
                <Sparkles className="h-3 w-3 text-amber-200" aria-hidden />
                Enterprise plan
              </>
            ) : (
              <>{entitlements?.tierLabel ?? "Workspace plan"} — shared seats</>
            )}
          </span>
        </div>
        <p className="mt-1 text-[length:var(--r5-font-body)] text-r5-text-secondary">
          {enterprise
            ? "Your workspace is on an enterprise contract. Invite teammates from Route5 and manage org roles in Clerk."
            : "Send operational invites from Route5, or share a join link. Seat checks run before email goes out."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setInviteMessage(null);
              setInviteModalOpen(true);
            }}
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-2 rounded-[var(--r5-radius-pill)] bg-r5-text-primary px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] font-semibold text-r5-surface-primary transition hover:opacity-95"
          >
            <MailPlus className="h-4 w-4" aria-hidden />
            Invite by email…
          </button>
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center gap-2 rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy join link
          </button>
          <Link
            href="/workspace/billing"
            className="inline-flex min-h-[var(--r5-nav-item-height)] items-center rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/70 px-[var(--r5-space-4)] text-[length:var(--r5-font-body)] text-r5-text-primary transition hover:bg-r5-surface-hover"
          >
            Manage seats &amp; billing
          </Link>
        </div>
        {inviteMessage ? (
          <p className="mt-3 text-[length:var(--r5-font-body)] text-r5-text-secondary">{inviteMessage}</p>
        ) : null}
      </section>

      <section className="r5-float-card rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-4)] shadow-[var(--r5-shadow-elevated)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">
            <Users className="h-5 w-5 text-r5-accent" strokeWidth={1.75} aria-hidden />
            Commitment owners
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-[var(--r5-radius-pill)] border border-r5-border-subtle bg-r5-surface-primary/60 px-[var(--r5-space-3)] py-1.5 text-[length:var(--r5-font-body)] text-r5-text-secondary transition hover:bg-r5-surface-hover hover:text-r5-text-primary"
          >
            Refresh list
          </button>
        </div>
        <p className="mt-1 text-[length:var(--r5-font-body)] text-r5-text-tertiary">
          Distinct owners in your org commitments (same workspace as Feed and Capture).
        </p>

        {error ? (
          <p className="mt-4 text-[length:var(--r5-font-body)] text-red-400">{error}</p>
        ) : rows === null ? (
          <div className="mt-4 space-y-2" aria-busy>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-[var(--r5-radius-md)] bg-r5-border-subtle/30" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-[length:var(--r5-font-body)] text-r5-text-secondary">
            No owners yet — assign a commitment in Feed or Capture to see people here.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rows.map((c) => {
              const self = user?.id === c.userId;
              return (
                <li
                  key={c.userId}
                  className="flex items-center gap-3 rounded-[var(--r5-radius-md)] border border-r5-border-subtle/70 bg-r5-surface-primary/40 px-[var(--r5-space-3)] py-2.5"
                >
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar URLs; avoid image remotePatterns drift
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-r5-border-subtle"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-r5-accent/15 text-[13px] font-semibold text-r5-accent">
                      {displayName(c).slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[length:var(--r5-font-subheading)] font-medium text-r5-text-primary">
                      {displayName(c)}
                      {self ? (
                        <span className="ml-2 text-[length:var(--r5-font-body)] font-normal text-r5-text-tertiary">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    {c.primaryEmail ? (
                      <p className="truncate text-[length:var(--r5-font-body)] text-r5-text-tertiary">{c.primaryEmail}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="r5-float-card rounded-[var(--r5-radius-lg)] border border-r5-border-subtle bg-r5-surface-secondary/35 p-[var(--r5-space-4)] shadow-[var(--r5-shadow-elevated)]">
        <h2 className="text-[length:var(--r5-font-subheading)] font-semibold text-r5-text-primary">Recent workspace updates</h2>
        <p className="mt-1 text-[length:var(--r5-font-body)] text-r5-text-secondary">
          Latest team-visible extraction activity across projects.
        </p>
        {loadingSummary ? (
          <div className="mt-3 h-20 animate-pulse rounded-[var(--r5-radius-md)] bg-r5-border-subtle/30" />
        ) : summary.recent.length === 0 ? (
          <p className="mt-3 text-[length:var(--r5-font-body)] text-r5-text-tertiary">
            No recent updates yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {summary.recent.slice(0, 6).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/projects/${item.projectId}#extractions-section`}
                  className="block rounded-[var(--r5-radius-md)] border border-r5-border-subtle/70 bg-r5-surface-primary/40 px-[var(--r5-space-3)] py-2.5 transition hover:border-r5-accent/35 hover:bg-r5-surface-primary/60"
                >
                  <p className="text-[length:var(--r5-font-body)] font-medium text-r5-text-primary">{item.projectName}</p>
                  <p className="mt-0.5 line-clamp-2 text-[length:var(--r5-font-body)] text-r5-text-secondary">
                    {item.summarySnippet}
                  </p>
                  <p className="mt-1 text-[11px] text-r5-text-tertiary">
                    {formatRelativeLong(item.createdAt, "en-US")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[length:var(--r5-font-body)] text-r5-text-tertiary">
        You can replay setup steps anytime from{" "}
        <Link href="/workspace/onboarding" className="font-medium text-r5-accent underline-offset-2 hover:underline">
          workspace onboarding
        </Link>{" "}
        and manage paid capacity under{" "}
        <Link href="/workspace/billing" className="font-medium text-r5-accent underline-offset-2 hover:underline">
          Billing
        </Link>
        .
      </p>
    </div>
  );
}
