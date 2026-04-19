"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

type InvitePayload = {
  invite?: {
    token: string;
    orgId: string;
    orgName: string;
    email: string;
    role: "admin" | "manager" | "member";
    inviterName: string;
    expiresAt: string;
    acceptedAt: string | null;
    expired: boolean;
  };
  error?: string;
};

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token ?? "");
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InvitePayload["invite"] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setLoading(false);
      setError("Invitation token missing.");
      return;
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/workspace/organization/invite/${encodeURIComponent(token)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as InvitePayload;
        if (cancelled) return;
        if (!res.ok || !data.invite) {
          setError(data.error ?? "Invitation not found.");
          setInvite(null);
          return;
        }
        setInvite(data.invite);
      } catch {
        if (!cancelled) {
          setError("Could not load invitation.");
          setInvite(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signupUrl = useMemo(
    () => `/sign-up?redirect_url=${encodeURIComponent(`/invite/${token}`)}`,
    [token]
  );
  const loginUrl = useMemo(
    () => `/login?redirect_url=${encodeURIComponent(`/invite/${token}`)}`,
    [token]
  );

  async function joinOrganization() {
    if (!token || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/organization/accept", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not accept invitation.");
        return;
      }
      router.replace("/feed?welcome=joined-org");
    } catch {
      setError("Could not accept invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-route5-shell min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-6 py-16">
        <div className="w-full rounded-2xl border border-white/10 bg-black/35 p-6 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Organization invitation
          </p>
          {loading ? (
            <p className="mt-3 text-sm text-neutral-300">Loading invitation…</p>
          ) : error ? (
            <p className="mt-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : invite ? (
            <>
              <h1 className="mt-2 text-2xl font-semibold text-white">{invite.orgName}</h1>
              <p className="mt-2 text-sm text-neutral-300">
                {invite.inviterName} invited you to join <span className="font-medium">{invite.orgName}</span> as{" "}
                <span className="font-medium">{invite.role}</span>.
              </p>
              <p className="mt-1 text-xs text-neutral-400">Invitation for {invite.email}</p>
              {invite.expired ? (
                <p className="mt-4 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  This invitation has expired. Ask an admin to send a new one.
                </p>
              ) : invite.acceptedAt ? (
                <p className="mt-4 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  This invitation was already accepted. Continue to Feed.
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-2">
                {!isLoaded ? null : !user ? (
                  <>
                    <Link
                      href={signupUrl}
                      className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-black"
                    >
                      Sign up to join
                    </Link>
                    <Link
                      href={loginUrl}
                      className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-sm font-medium text-white"
                    >
                      Already have an account
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy || Boolean(invite.expired)}
                    onClick={() => void joinOrganization()}
                    className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {busy ? "Joining…" : "Join organization"}
                  </button>
                )}
                <Link
                  href="/feed"
                  className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 text-sm font-medium text-white"
                >
                  Go to Feed
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
