"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MailPlus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import {
  ORG_NAV_KEYS,
  defaultOrgUiPolicy,
  parseOrgUiPolicy,
  type OrgNavKey,
  type OrgUiPolicy,
} from "@/lib/org-ui-policy";
import {
  readCachedOrgPayload,
  writeCachedOrgPayload,
} from "@/lib/org-payload-cache";

type OrgRole = "admin" | "manager" | "member";

type OrganizationMember = {
  userId: string;
  role: OrgRole;
  joinedAt: string;
  status: string;
  invitedBy: string | null;
  activeCommitmentsCount: number;
  profile: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
    imageUrl: string | null;
    primaryEmail: string | null;
  };
};

type OrganizationPayload = {
  orgId: string;
  orgName: string;
  uiPolicy?: unknown;
  me: { userId: string; role: OrgRole };
  members: OrganizationMember[];
  invitations?: Array<{
    id: string;
    email: string;
    role: OrgRole;
    status: "pending";
    invitedByName: string;
    createdAt: string;
    expiresAt: string;
  }>;
};

function memberName(member: OrganizationMember): string {
  const full = [member.profile.firstName, member.profile.lastName].filter(Boolean).join(" ").trim();
  return full || member.profile.username || member.profile.primaryEmail || member.userId;
}

const NAV_LABEL: Record<OrgNavKey, string> = {
  home: "Home (always on)",
  desk: "Desk",
  tasks: "Task tracker",
  organization: "Organization",
  companies: "Companies",
  customize: "Customize",
  help: "Help",
  settings: "Settings",
  billing: "Billing",
};

export default function WorkspaceOrganizationClient() {
  const { refreshOrganization } = useWorkspaceData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OrganizationPayload | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyInvite, setBusyInvite] = useState(false);
  const [busyResendId, setBusyResendId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uiPolicy, setUiPolicy] = useState<OrgUiPolicy>(() => defaultOrgUiPolicy());
  const [busyPolicy, setBusyPolicy] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const isAdmin = state?.me.role === "admin";

  const applyPayload = useCallback((data: OrganizationPayload) => {
    setState(data);
    setUiPolicy(parseOrgUiPolicy(data.uiPolicy));
    writeCachedOrgPayload(data);
    setError(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const tryFetch = async () => {
      const res = await fetch("/api/workspace/organization", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as OrganizationPayload & { error?: string };
      if (!res.ok) {
        return { ok: false as const, error: data.error ?? "Could not load organization." };
      }
      return { ok: true as const, data };
    };

    try {
      let lastError = "Could not load organization.";
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const out = await tryFetch();
          if (out.ok) {
            setFromCache(false);
            applyPayload(out.data);
            return;
          }
          lastError = out.error;
        } catch {
          lastError = "Network error while loading organization.";
        }
        if (attempt < 2) await delay(400 * (attempt + 1));
      }

      const cached = readCachedOrgPayload() as OrganizationPayload | null;
      if (cached?.orgId && Array.isArray(cached.members)) {
        setFromCache(true);
        applyPayload(cached);
        setError(
          "Could not reach the server after several tries — showing your last saved copy on this device. Use Retry to sync when you are back online."
        );
        return;
      }
      setState(null);
      setError(lastError);
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const orgId = state?.orgId;
    if (!orgId) return;
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`org-members:${orgId}`);
    channel.on("broadcast", { event: "changed" }, () => {
      void load();
    });
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [state?.orgId, load]);

  const sortedMembers = useMemo(
    () =>
      [...(state?.members ?? [])].sort((a, b) => {
        const rank = (role: OrgRole) => (role === "admin" ? 0 : role === "manager" ? 1 : 2);
        return rank(a.role) - rank(b.role) || a.joinedAt.localeCompare(b.joinedAt);
      }),
    [state?.members]
  );
  const pendingInvites = state?.invitations ?? [];

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setBusyInvite(true);
    setNotice(null);
    try {
      const res = await fetch("/api/workspace/organization", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Could not send invitation.");
        return;
      }
      setInviteEmail("");
      setInviteRole("member");
      setNotice("Invitation sent.");
      await load();
    } finally {
      setBusyInvite(false);
    }
  }

  async function changeRole(memberUserId: string, role: OrgRole) {
    setBusyMemberId(memberUserId);
    setNotice(null);
    try {
      const res = await fetch(`/api/workspace/organization/members/${encodeURIComponent(memberUserId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Could not update role.");
        return;
      }
      await load();
    } finally {
      setBusyMemberId(null);
    }
  }

  async function saveNavPolicy(next: OrgUiPolicy) {
    if (!isAdmin) return;
    setBusyPolicy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/workspace/organization", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uiPolicy: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; uiPolicy?: unknown };
      if (!res.ok) {
        setNotice(data.error ?? "Could not update visibility.");
        return;
      }
      if (data.uiPolicy) setUiPolicy(parseOrgUiPolicy(data.uiPolicy));
      await refreshOrganization();
      setNotice("Workspace visibility updated.");
    } finally {
      setBusyPolicy(false);
    }
  }

  function toggleNavKey(key: OrgNavKey, on: boolean) {
    if (key === "home") return;
    const next: OrgUiPolicy = {
      nav: { ...uiPolicy.nav, [key]: on },
    };
    setUiPolicy(next);
    void saveNavPolicy(next);
  }

  async function resendInvite(invitationId: string) {
    setBusyResendId(invitationId);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/workspace/organization/invitations/${encodeURIComponent(invitationId)}/resend`,
        { method: "POST", credentials: "same-origin" }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Could not resend the invitation email.");
        return;
      }
      setNotice("Invitation email sent again.");
    } finally {
      setBusyResendId(null);
    }
  }

  async function removeMember(memberUserId: string, name: string) {
    const ok = window.confirm(`Remove ${name} from this organization?`);
    if (!ok) return;
    setBusyMemberId(memberUserId);
    setNotice(null);
    try {
      const res = await fetch(`/api/workspace/organization/members/${encodeURIComponent(memberUserId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Could not remove member.");
        return;
      }
      await load();
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-5">
      <div>
        <Link href="/desk" className="text-[13px] text-r5-text-secondary hover:text-r5-text-primary">
          ← Desk
        </Link>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-r5-text-tertiary">
          Workspace
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-r5-text-primary">
          Organization
        </h1>
        <p className="mt-2 text-[14px] text-r5-text-secondary">
          Manage team members, access roles, and shared ownership.
        </p>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-r5-text-tertiary">
          Invite people by email—they sign in with their own account and join this organization.
          They inherit this org&apos;s plan and limits (what you see under Billing); admins assign which
          projects each person can access.
        </p>
      </div>

      <section className="rounded-2xl border border-r5-border-subtle bg-r5-surface-secondary/40 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-r5-text-tertiary">
              Invite by email
            </label>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="mt-1.5 min-h-11 w-full rounded-xl border border-r5-border-subtle bg-r5-surface-primary/70 px-3 text-[14px] text-r5-text-primary placeholder:text-r5-text-tertiary"
              disabled={!isAdmin}
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as OrgRole)}
            className="min-h-11 rounded-xl border border-r5-border-subtle bg-r5-surface-primary/70 px-3 text-[14px] text-r5-text-primary"
            disabled={!isAdmin}
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Member</option>
          </select>
          <button
            type="button"
            disabled={!isAdmin || busyInvite || !inviteEmail.trim()}
            onClick={() => void inviteMember()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-r5-text-primary px-4 text-[14px] font-semibold text-r5-surface-primary disabled:opacity-50"
          >
            <MailPlus className="h-4 w-4" />
            {busyInvite ? "Sending…" : "Invite"}
          </button>
        </div>
        {!isAdmin ? (
          <p className="mt-2 text-[12px] text-r5-text-tertiary">
            Only admins can invite members.
          </p>
        ) : null}
      </section>

      {isAdmin ? (
        <section className="rounded-2xl border border-r5-border-subtle bg-r5-surface-secondary/40 p-4">
          <h2 className="text-[15px] font-semibold text-r5-text-primary">Who can see what</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-r5-text-tertiary">
            Admins always have full access. For members and managers, turn off areas they should not see in
            the sidebar, mobile bar, and quick links.
          </p>
          <ul className="mt-4 space-y-2.5">
            {ORG_NAV_KEYS.map((key) => {
              const on = key === "home" ? true : Boolean(uiPolicy.nav[key]);
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-r5-border-subtle/60 bg-r5-surface-primary/50 px-3 py-2.5"
                >
                  <span className="text-[13px] font-medium text-r5-text-primary">{NAV_LABEL[key]}</span>
                  <label className="inline-flex items-center gap-2 text-[12px] text-r5-text-secondary">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-r5-border-subtle"
                      checked={on}
                      disabled={key === "home" || busyPolicy}
                      onChange={(e) => toggleNavKey(key, e.target.checked)}
                    />
                    {on ? "Visible" : "Hidden"}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-r5-border-subtle bg-r5-surface-secondary/35 p-4">
        {loading ? (
          <div className="space-y-2" aria-busy>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-r5-border-subtle/35" />
            ))}
          </div>
        ) : !state && error ? (
          <div className="space-y-3">
            <p className="text-[13px] text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex min-h-10 items-center rounded-xl border border-r5-border-subtle bg-r5-surface-primary px-4 text-[13px] font-medium text-r5-text-primary"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {fromCache && error ? (
              <div className="mb-3 flex flex-col gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] leading-snug text-amber-100/95">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="shrink-0 self-start rounded-lg border border-amber-300/40 bg-amber-500/15 px-3 py-1.5 text-[12px] font-semibold text-amber-50 transition hover:bg-amber-500/25 disabled:opacity-50"
                >
                  Retry sync
                </button>
              </div>
            ) : null}
            <p className="text-[12px] text-r5-text-secondary">
              {state?.orgName ?? "Organization"} · {sortedMembers.length} active · {pendingInvites.length} pending
            </p>
            {pendingInvites.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-r5-border-subtle/70 bg-r5-surface-primary/50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-r5-text-secondary">
                  Pending invitations
                </p>
                {pendingInvites.map((invite) => {
                  const resendBusy = busyResendId === invite.id;
                  return (
                    <div
                      key={invite.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-r5-border-subtle/60 bg-r5-surface-secondary/35 px-3 py-2"
                    >
                      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-r5-text-primary">
                        {invite.email}
                      </p>
                      <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                        Pending
                      </span>
                      <span className="rounded-full border border-r5-border-subtle px-2 py-0.5 text-[11px] font-semibold text-r5-text-primary">
                        {invite.role}
                      </span>
                      <p className="w-full text-[11px] text-r5-text-secondary sm:w-auto sm:flex-1">
                        Invited by {invite.invitedByName}
                      </p>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => void resendInvite(invite.id)}
                          disabled={resendBusy}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-r5-border-subtle bg-r5-surface-primary/50 px-2.5 text-[12px] font-medium text-r5-text-secondary hover:text-r5-text-primary disabled:opacity-50"
                        >
                          <RotateCcw className={`h-3.5 w-3.5 ${resendBusy ? "animate-spin" : ""}`} aria-hidden />
                          {resendBusy ? "Sending…" : "Resend email"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {sortedMembers.map((member) => {
              const name = memberName(member);
              const busy = busyMemberId === member.userId;
              const me = state?.me.userId === member.userId;
              return (
                <div
                  key={member.userId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-r5-border-subtle/70 bg-r5-surface-primary/50 px-3 py-2.5"
                >
                  {member.profile.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.profile.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-r5-border-subtle"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-r5-accent/15 text-[13px] font-semibold text-r5-accent">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-r5-text-primary">
                      {name}
                      {me ? <span className="ml-1 text-[12px] font-normal text-r5-text-tertiary">(you)</span> : null}
                    </p>
                    <p className="truncate text-[12px] text-r5-text-secondary">
                      {member.profile.primaryEmail ?? member.userId}
                    </p>
                  </div>
                  <span className="rounded-full border border-r5-border-subtle px-2 py-0.5 text-[11px] font-medium text-r5-text-secondary">
                    {member.activeCommitmentsCount} active
                  </span>
                  <span className="rounded-full border border-r5-border-subtle px-2 py-0.5 text-[11px] font-semibold text-r5-text-primary">
                    {member.role}
                  </span>
                  {isAdmin ? (
                    <select
                      value={member.role}
                      onChange={(e) => void changeRole(member.userId, e.target.value as OrgRole)}
                      disabled={busy}
                      className="min-h-10 rounded-lg border border-r5-border-subtle bg-r5-surface-secondary px-2.5 text-[12px] text-r5-text-primary"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="member">Member</option>
                    </select>
                  ) : null}
                  {isAdmin && !me ? (
                    <button
                      type="button"
                      onClick={() => void removeMember(member.userId, name)}
                      disabled={busy}
                      className="min-h-10 rounded-lg border border-red-400/35 bg-red-500/10 px-3 text-[12px] font-medium text-red-200 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
        {notice ? <p className="mt-3 text-[12px] text-r5-text-secondary">{notice}</p> : null}
      </section>
    </div>
  );
}
