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
  const [visibilityScope, setVisibilityScope] = useState<"everyone" | "member">("everyone");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

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
  const configurableMembers = useMemo(
    () => sortedMembers.filter((m) => m.role !== "admin"),
    [sortedMembers]
  );
  const adminCount = useMemo(
    () => sortedMembers.filter((member) => member.role === "admin").length,
    [sortedMembers]
  );
  const canClaimFounderAccess = Boolean(state?.me.userId) && !isAdmin && adminCount === 0;

  useEffect(() => {
    if (visibilityScope !== "member") return;
    if (selectedMemberId && configurableMembers.some((m) => m.userId === selectedMemberId)) return;
    setSelectedMemberId(configurableMembers[0]?.userId ?? "");
  }, [visibilityScope, configurableMembers, selectedMemberId]);

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

  async function claimFounderAccess() {
    const me = state?.me.userId;
    if (!me) return;
    setBusyMemberId(me);
    setNotice(null);
    try {
      const res = await fetch(`/api/workspace/organization/members/${encodeURIComponent(me)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNotice(data.error ?? "Could not claim founder access.");
        return;
      }
      setNotice("Founder access enabled. You now have full admin controls.");
      await load();
    } finally {
      setBusyMemberId(null);
    }
  }

  async function saveNavPolicy(next: OrgUiPolicy): Promise<boolean> {
    if (!isAdmin) return false;
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
        return false;
      }
      if (data.uiPolicy) setUiPolicy(parseOrgUiPolicy(data.uiPolicy));
      await refreshOrganization();
      setNotice("Workspace visibility updated.");
      return true;
    } finally {
      setBusyPolicy(false);
    }
  }

  function navValueForScope(policy: OrgUiPolicy, key: OrgNavKey): boolean {
    if (key === "home") return true;
    if (visibilityScope !== "member" || !selectedMemberId) return Boolean(policy.nav[key]);
    const override = policy.userNav[selectedMemberId]?.[key];
    if (override === true || override === false) return override;
    return Boolean(policy.nav[key]);
  }

  async function toggleNavKey(key: OrgNavKey, on: boolean) {
    if (key === "home") return;
    const prev = uiPolicy;
    const next: OrgUiPolicy = {
      nav: { ...uiPolicy.nav, [key]: on },
      userNav: { ...uiPolicy.userNav },
    };
    if (visibilityScope === "member" && selectedMemberId) {
      const currentOverride = next.userNav[selectedMemberId] ?? {};
      next.userNav[selectedMemberId] = { ...currentOverride, [key]: on };
    } else {
      next.nav[key] = on;
    }
    setUiPolicy(next);
    const ok = await saveNavPolicy(next);
    if (!ok) setUiPolicy(prev);
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
        <Link href="/desk" className="text-[13px] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
          ← Desk
        </Link>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Workspace
        </p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
          Organization Control
        </h1>
        <p className="mt-2 text-[14px] text-slate-600 dark:text-slate-300">
          Admin surface for team members, access roles, and workspace visibility.
        </p>
        <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          Invite people by email—they sign in with their own account and join this organization.
          They inherit this org&apos;s plan and limits (what you see under Billing); admins assign which
          projects each person can access.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.4)] dark:border-slate-700 dark:bg-slate-950/55">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              Invite by email
            </label>
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
              disabled={!isAdmin}
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as OrgRole)}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-[14px] text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
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
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-[14px] font-semibold text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            <MailPlus className="h-4 w-4" />
            {busyInvite ? "Sending…" : "Invite"}
          </button>
        </div>
        {!isAdmin ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              Only admins can invite members.
            </p>
            {canClaimFounderAccess ? (
              <button
                type="button"
                onClick={() => void claimFounderAccess()}
                disabled={busyMemberId === state?.me.userId}
                className="min-h-9 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 text-[12px] font-semibold text-emerald-200 disabled:opacity-50"
              >
                {busyMemberId === state?.me.userId ? "Claiming..." : "Claim founder access"}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {isAdmin ? (
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.4)] dark:border-slate-700 dark:bg-slate-950/55">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Who can see what</h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            Admins always have full access. For members and managers, turn off areas they should not see in
            the sidebar, mobile bar, and quick links.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Apply to
              </label>
              <select
                value={visibilityScope}
                onChange={(e) => setVisibilityScope(e.target.value as "everyone" | "member")}
                className="mt-1.5 min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
              >
                <option value="everyone">Everyone (all non-admins)</option>
                <option value="member">Specific member</option>
              </select>
            </div>
            {visibilityScope === "member" ? (
              <div className="min-w-[220px] flex-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Member
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
                >
                  {configurableMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {memberName(member)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <ul className="mt-4 space-y-2.5">
            {ORG_NAV_KEYS.map((key) => {
              const on = navValueForScope(uiPolicy, key);
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{NAV_LABEL[key]}</span>
                  <label className="inline-flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
                      checked={on}
                      disabled={key === "home" || busyPolicy || (visibilityScope === "member" && !selectedMemberId)}
                      onChange={(e) => void toggleNavKey(key, e.target.checked)}
                    />
                    {on ? "Visible" : "Hidden"}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.4)] dark:border-slate-700 dark:bg-slate-950/55">
        {loading ? (
          <div className="space-y-2" aria-busy>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-r5-border-subtle/35" />
            ))}
          </div>
        ) : !state && error ? (
          <div className="space-y-3">
            <p className="text-[13px] text-red-300">{error}</p>
            <p className="text-[12px] text-r5-text-tertiary">
              If this page looks corrupted, retry to resync membership and organization policy from the
              server.
            </p>
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
            <p className="text-[12px] text-slate-600 dark:text-slate-300">
              {state?.orgName ?? "Organization"} · {sortedMembers.length} active · {pendingInvites.length} pending
            </p>
            {pendingInvites.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-r5-border-subtle/70 bg-r5-surface-primary/50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
                  Pending invitations
                </p>
                {pendingInvites.map((invite) => {
                  const resendBusy = busyResendId === invite.id;
                  return (
                    <div
                      key={invite.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
                    >
                      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">
                        {invite.email}
                      </p>
                      <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                        Pending
                      </span>
                      <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                        {invite.role}
                      </span>
                      <p className="w-full text-[11px] text-slate-600 dark:text-slate-300 sm:w-auto sm:flex-1">
                        Invited by {invite.invitedByName}
                      </p>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => void resendInvite(invite.id)}
                          disabled={resendBusy}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:text-slate-100"
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
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40"
                >
                  {member.profile.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.profile.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-slate-100">
                      {name}
                      {me ? <span className="ml-1 text-[12px] font-normal text-slate-500 dark:text-slate-400">(you)</span> : null}
                    </p>
                    <p className="truncate text-[12px] text-slate-600 dark:text-slate-300">
                      {member.profile.primaryEmail ?? member.userId}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {member.activeCommitmentsCount} active
                  </span>
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-200">
                    {member.role}
                  </span>
                  {isAdmin ? (
                    <select
                      value={member.role}
                      onChange={(e) => void changeRole(member.userId, e.target.value as OrgRole)}
                      disabled={busy || me}
                      className="min-h-10 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] text-slate-900 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
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
        {notice ? <p className="mt-3 text-[12px] text-slate-600 dark:text-slate-300">{notice}</p> : null}
      </section>
    </div>
  );
}
