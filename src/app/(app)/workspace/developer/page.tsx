"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  KeyRound,
  Loader2,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { WEBHOOK_EVENT_TYPES } from "@/lib/public-api/types";
import { canAccessDeveloperTools } from "@/lib/feature-flags";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
};

type LastDelivery = {
  id: string;
  event_type: string;
  response_status: number | null;
  attempt_count: number;
  delivered_at: string | null;
  failed_at: string | null;
  next_retry_at: string | null;
  created_at: string;
};

type WebhookEndpointRow = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
  last_delivery: LastDelivery | null;
};

type DeliveryRow = {
  id: string;
  event_type: string;
  response_status: number | null;
  response_body: string | null;
  attempt_count: number;
  delivered_at: string | null;
  failed_at: string | null;
  next_retry_at: string | null;
  created_at: string;
};

const SCOPE_LABELS: Record<string, string> = {
  read: "Read — GET /api/v1/*",
  write: "Write — create & update commitments",
  webhooks: "Webhooks — manage endpoints (dashboard)",
};

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
}

export default function WorkspaceDeveloperPage() {
  const { user } = useUser();
  const devToolsEnabled = canAccessDeveloperTools(user?.primaryEmailAddress?.emailAddress);

  const [baseUrl, setBaseUrl] = useState("");
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [endpoints, setEndpoints] = useState<WebhookEndpointRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState({ read: true, write: false, webhooks: false });
  const [newKeyModal, setNewKeyModal] = useState<{ key: string; prefix: string } | null>(null);

  const [whUrl, setWhUrl] = useState("");
  const [whDesc, setWhDesc] = useState("");
  const [whEvents, setWhEvents] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(WEBHOOK_EVENT_TYPES.map((e) => [e, false]))
  );
  const [newSecretModal, setNewSecretModal] = useState<{ secret: string; url: string } | null>(null);

  const [editEp, setEditEp] = useState<WebhookEndpointRow | null>(null);
  const [deliveriesByEp, setDeliveriesByEp] = useState<Record<string, DeliveryRow[] | "loading">>({});
  const [openRef, setOpenRef] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setBaseUrl(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const load = useCallback(async () => {
    if (!devToolsEnabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [kRes, wRes] = await Promise.all([
        fetch("/api/keys", { credentials: "same-origin" }),
        fetch("/api/webhooks", { credentials: "same-origin" }),
      ]);
      const kJson = (await kRes.json().catch(() => ({}))) as { keys?: ApiKeyRow[]; error?: string };
      const wJson = (await wRes.json().catch(() => ({}))) as { endpoints?: WebhookEndpointRow[]; error?: string };
      if (!kRes.ok) throw new Error(kJson.error ?? "Could not load API keys.");
      if (!wRes.ok) throw new Error(wJson.error ?? "Could not load webhooks.");
      setKeys(kJson.keys ?? []);
      setEndpoints(wJson.endpoints ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [devToolsEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    const scopes: string[] = [];
    if (keyScopes.read) scopes.push("read");
    if (keyScopes.write) scopes.push("write");
    if (keyScopes.webhooks) scopes.push("webhooks");
    if (scopes.length === 0) {
      setNotice("Select at least one scope.");
      return;
    }
    setBusy("key");
    setNotice(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() || "API key", scopes }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        key?: string;
        key_prefix?: string;
        warning?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not create key.");
      if (data.key && data.key_prefix) {
        setNewKeyModal({ key: data.key, prefix: data.key_prefix });
      }
      setKeyName("");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setBusy(null);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    setBusy(`revoke-${id}`);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Revoke failed.");
      }
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Revoke failed.");
    } finally {
      setBusy(null);
    }
  }

  async function createWebhook() {
    const ev = WEBHOOK_EVENT_TYPES.filter((e) => whEvents[e]);
    if (ev.length === 0) {
      setNotice("Select at least one event type.");
      return;
    }
    setBusy("wh");
    setNotice(null);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: whUrl.trim(), description: whDesc.trim() || null, events: ev }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        secret?: string;
        endpoint?: { url: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not create webhook.");
      if (data.secret && data.endpoint?.url) {
        setNewSecretModal({ secret: data.secret, url: data.endpoint.url });
      }
      setWhUrl("");
      setWhDesc("");
      setWhEvents(Object.fromEntries(WEBHOOK_EVENT_TYPES.map((e) => [e, false])));
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    if (!editEp) return;
    setBusy("edit-wh");
    setNotice(null);
    try {
      const res = await fetch(`/api/webhooks/${editEp.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: editEp.url,
          description: editEp.description,
          events: editEp.events,
          enabled: editEp.enabled,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Update failed.");
      setEditEp(null);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Delete this webhook endpoint?")) return;
    setBusy(`del-wh-${id}`);
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Delete failed.");
      }
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  async function testWebhook(id: string) {
    setBusy(`test-${id}`);
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: "POST", credentials: "same-origin" });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; status?: number; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Test failed.");
      await load();
      await loadDeliveries(id);
      alert(j.ok ? `Test delivered (HTTP ${j.status ?? "?"})` : `Test completed with status ${j.status ?? "?"}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setBusy(null);
    }
  }

  async function loadDeliveries(id: string) {
    setDeliveriesByEp((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const res = await fetch(`/api/webhooks/${id}/deliveries?limit=50`, { credentials: "same-origin" });
      const j = (await res.json().catch(() => ({}))) as { deliveries?: DeliveryRow[] };
      if (res.ok) {
        setDeliveriesByEp((prev) => ({ ...prev, [id]: j.deliveries ?? [] }));
      }
    } catch {
      setDeliveriesByEp((prev) => ({ ...prev, [id]: [] }));
    }
  }

  const refSections = useMemo(
    () => [
      {
        id: "v1-commitments",
        title: "GET /api/v1/commitments",
        scope: "read",
        desc: "List commitments with filters.",
        curl: `curl -sS -H "Authorization: Bearer <API_KEY>" \\
  "${baseUrl || "https://your-app.com"}/api/v1/commitments?status=active&limit=50"`,
      },
      {
        id: "v1-commitment-single",
        title: "GET /api/v1/commitments/:id",
        scope: "read",
        desc: "Single commitment with comments, attachments, history, dependencies.",
        curl: `curl -sS -H "Authorization: Bearer <API_KEY>" \\
  "${baseUrl || "https://your-app.com"}/api/v1/commitments/<ID>"`,
      },
      {
        id: "v1-commitments-post",
        title: "POST /api/v1/commitments",
        scope: "write",
        desc: "Create commitment (title, description, owner_id, deadline, priority).",
        curl: `curl -sS -X POST -H "Authorization: Bearer <API_KEY>" -H "Content-Type: application/json" \\
  -d '{"title":"Ship Q1","description":"","owner_id":"<user_id>","deadline":"2026-12-31","priority":"high"}' \\
  "${baseUrl || "https://your-app.com"}/api/v1/commitments"`,
      },
      {
        id: "v1-commitments-patch",
        title: "PATCH /api/v1/commitments/:id",
        scope: "write",
        desc: "Update fields; changes are logged to history.",
        curl: `curl -sS -X PATCH -H "Authorization: Bearer <API_KEY>" -H "Content-Type: application/json" \\
  -d '{"title":"Updated title"}' \\
  "${baseUrl || "https://your-app.com"}/api/v1/commitments/<ID>"`,
      },
      {
        id: "v1-escalations",
        title: "GET /api/v1/escalations",
        scope: "read",
        desc: "List escalations.",
        curl: `curl -sS -H "Authorization: Bearer <API_KEY>" \\
  "${baseUrl || "https://your-app.com"}/api/v1/escalations?limit=25"`,
      },
      {
        id: "v1-dashboard",
        title: "GET /api/v1/dashboard",
        scope: "read",
        desc: "Health score, counts, top escalations.",
        curl: `curl -sS -H "Authorization: Bearer <API_KEY>" \\
  "${baseUrl || "https://your-app.com"}/api/v1/dashboard"`,
      },
      {
        id: "v1-audit",
        title: "GET /api/v1/audit-log",
        scope: "read",
        desc: "Audit log entries for the organization.",
        curl: `curl -sS -H "Authorization: Bearer <API_KEY>" \\
  "${baseUrl || "https://your-app.com"}/api/v1/audit-log?limit=50"`,
      },
      {
        id: "v1-org",
        title: "GET /api/v1/org",
        scope: "read",
        desc: "Organization name, plan, seats, created_at.",
        curl: `curl -sS -H "Authorization: Bearer <API_KEY>" \\
  "${baseUrl || "https://your-app.com"}/api/v1/org"`,
      },
    ],
    [baseUrl]
  );

  if (!devToolsEnabled) {
    return (
      <div className="mx-auto w-full max-w-[min(100%,760px)] pb-24">
        <div className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/70 px-5 py-6">
          <h1 className="text-[18px] font-semibold text-[var(--workspace-fg)]">Developer tools are disabled</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
            This workspace hides internal API tooling for standard users. Enable{" "}
            <code className="rounded bg-[var(--workspace-canvas)] px-1.5 py-0.5 text-[12px]">
              NEXT_PUBLIC_ROUTE5_SHOW_DEV_TOOLS
            </code>{" "}
            if your deployment requires this surface.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex rounded-xl border border-[var(--workspace-border)] px-3 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]/40"
          >
            Back to settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[min(100%,960px)] pb-24">
      <div className="mb-6">
        <Link
          href="/overview"
          className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          ← Overview
        </Link>
        <h1 className="sr-only">Developer</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          API keys, outbound webhooks, and REST reference for integrating Route5 with your stack.
        </p>
      </div>

      {loading ? (
        <p className="text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {loadError}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !loadError ? (
      <>
      {notice ? <p className="mb-4 text-[13px] text-red-400">{notice}</p> : null}
      <div className="mb-6 rounded-2xl border border-[var(--workspace-accent)]/25 bg-[var(--workspace-canvas)]/40 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--workspace-muted-fg)]">
          Public API base URL
        </p>
        <p className="mt-1 break-all font-mono text-[14px] text-[var(--workspace-fg)]">
          {baseUrl || "…"}
        </p>
        <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">
          Send <code className="rounded bg-[var(--workspace-surface)] px-1.5 py-0.5 font-mono text-[11px]">Authorization: Bearer &lt;api_key&gt;</code>{" "}
          on all <code className="font-mono text-[11px]">/api/v1/*</code> routes. Rate limit: 100/min per key (configurable via{" "}
          <code className="font-mono text-[11px]">PUBLIC_API_RATE_LIMIT_PER_MINUTE</code>).
        </p>
      </div>

      {newKeyModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-key-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 shadow-xl">
            <h2 id="new-key-title" className="text-[16px] font-semibold text-[var(--workspace-fg)]">
              API key created
            </h2>
            <p className="mt-2 text-[13px] text-amber-200/90">
              Copy this key now — it will not be shown again. Prefix stored:{" "}
              <span className="font-mono">{newKeyModal.prefix}</span>
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 p-3">
              <code className="flex-1 break-all font-mono text-[12px] text-[var(--workspace-fg)]">{newKeyModal.key}</code>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-[var(--workspace-border)] p-2 text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
                onClick={() => copyText(newKeyModal.key)}
                aria-label="Copy key"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-[var(--workspace-accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-accent-fg)]"
              onClick={() => setNewKeyModal(null)}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {newSecretModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 shadow-xl">
            <h2 className="text-[16px] font-semibold text-[var(--workspace-fg)]">Webhook signing secret</h2>
            <p className="mt-2 text-[13px] text-amber-200/90">
              Copy this secret now — it will not be shown again. Verify payloads with HMAC-SHA256 using the{" "}
              <code className="font-mono text-[11px]">Route5-Signature</code> header.
            </p>
            <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">
              Endpoint: <span className="break-all font-mono">{newSecretModal.url}</span>
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/50 p-3">
              <code className="flex-1 break-all font-mono text-[11px] text-[var(--workspace-fg)]">
                {newSecretModal.secret}
              </code>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-[var(--workspace-border)] p-2"
                onClick={() => copyText(newSecretModal.secret)}
                aria-label="Copy secret"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-[var(--workspace-accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-accent-fg)]"
              onClick={() => setNewSecretModal(null)}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {editEp ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] p-5 shadow-xl">
            <h2 className="text-[16px] font-semibold text-[var(--workspace-fg)]">Edit webhook</h2>
            <label className="mt-3 block text-[11px] font-medium text-[var(--workspace-muted-fg)]">URL</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              value={editEp.url}
              onChange={(e) => setEditEp({ ...editEp, url: e.target.value })}
            />
            <label className="mt-3 block text-[11px] font-medium text-[var(--workspace-muted-fg)]">Description</label>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              value={editEp.description ?? ""}
              onChange={(e) => setEditEp({ ...editEp, description: e.target.value || null })}
            />
            <label className="mt-3 block text-[11px] font-medium text-[var(--workspace-muted-fg)]">Events</label>
            <div className="mt-2 flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-xl border border-[var(--workspace-border)]/60 p-2">
              {WEBHOOK_EVENT_TYPES.map((ev) => (
                <label key={ev} className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--workspace-fg)]">
                  <input
                    type="checkbox"
                    checked={editEp.events.includes(ev)}
                    onChange={(e) => {
                      const next = new Set(editEp.events);
                      if (e.target.checked) next.add(ev);
                      else next.delete(ev);
                      setEditEp({ ...editEp, events: [...next] });
                    }}
                  />
                  <span className="font-mono text-[11px]">{ev}</span>
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-[13px] text-[var(--workspace-fg)]">
              <input
                type="checkbox"
                checked={editEp.enabled}
                onChange={(e) => setEditEp({ ...editEp, enabled: e.target.checked })}
              />
              Enabled
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-[var(--workspace-border)] px-4 py-2.5 text-[13px] font-medium"
                onClick={() => setEditEp(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy === "edit-wh"}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--workspace-accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-accent-fg)] disabled:opacity-50"
                onClick={() => void saveEdit()}
              >
                {busy === "edit-wh" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[var(--workspace-accent)]" aria-hidden />
            <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">API keys</h2>
          </div>
          <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">
            Keys are hashed server-side. Use read for GET-only automation; write for creating and updating commitments.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--workspace-border)]/80 text-[11px] uppercase tracking-wide text-[var(--workspace-muted-fg)]">
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Prefix</th>
                  <th className="pb-2 pr-3">Scopes</th>
                  <th className="pb-2 pr-3">Last used</th>
                  <th className="pb-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-[var(--workspace-border)]/40">
                    <td className="py-2.5 pr-3 font-medium text-[var(--workspace-fg)]">{k.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-[12px] text-[var(--workspace-muted-fg)]">{k.key_prefix}</td>
                    <td className="py-2.5 pr-3 text-[var(--workspace-muted-fg)]">{k.scopes.join(", ")}</td>
                    <td className="py-2.5 pr-3 text-[var(--workspace-muted-fg)]">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <button
                        type="button"
                        disabled={busy?.startsWith("revoke")}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-2 py-1 text-[12px] text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                        onClick={() => void revokeKey(k.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {keys.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--workspace-muted-fg)]">No API keys yet.</p>
            ) : null}
          </div>

          <div className="mt-6 rounded-xl border border-[var(--workspace-border)]/70 bg-[var(--workspace-canvas)]/30 p-4">
            <p className="text-[13px] font-medium text-[var(--workspace-fg)]">Create key</p>
            <input
              className="mt-2 w-full max-w-md rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              placeholder="Label (e.g. CI/CD)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-4">
              {(["read", "write", "webhooks"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 text-[13px] text-[var(--workspace-fg)]">
                  <input
                    type="checkbox"
                    checked={keyScopes[s]}
                    onChange={(e) => setKeyScopes((prev) => ({ ...prev, [s]: e.target.checked }))}
                  />
                  <span className="capitalize">{s}</span>
                  <span className="text-[11px] text-[var(--workspace-muted-fg)]">{SCOPE_LABELS[s]}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={busy === "key"}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--workspace-accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-accent-fg)] disabled:opacity-50"
              onClick={() => void createKey()}
            >
              {busy === "key" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Generate key
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-[var(--workspace-accent)]" aria-hidden />
            <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Webhooks</h2>
          </div>
          <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">
            Route5 signs JSON bodies with HMAC-SHA256 in the <code className="font-mono text-[11px]">Route5-Signature</code> header.
          </p>

          <div className="mt-4 space-y-4">
            {endpoints.map((ep) => {
              const last = ep.last_delivery;
              const status = last
                ? last.delivered_at
                  ? "delivered"
                  : last.failed_at
                    ? "failed"
                    : "pending"
                : "none";
              const deliveries = deliveriesByEp[ep.id];
              return (
                <div
                  key={ep.id}
                  className="rounded-xl border border-[var(--workspace-border)]/70 bg-[var(--workspace-canvas)]/25 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-all font-mono text-[14px] font-medium text-[var(--workspace-fg)]">{ep.url}</p>
                      {ep.description ? (
                        <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">{ep.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ep.events.map((ev) => (
                          <span
                            key={ev}
                            className="inline-block rounded-md border border-[var(--workspace-border)]/80 px-2 py-0.5 font-mono text-[10px] text-[var(--workspace-muted-fg)]"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">
                        {ep.enabled ? (
                          <span className="text-emerald-300/90">Enabled</span>
                        ) : (
                          <span className="text-amber-300/90">Disabled</span>
                        )}
                        {" · "}
                        Last delivery:{" "}
                        {last ? (
                          <>
                            <span
                              className={
                                status === "delivered"
                                  ? "text-emerald-300/90"
                                  : status === "failed"
                                    ? "text-red-300/90"
                                    : "text-amber-200/90"
                              }
                            >
                              {status}
                            </span>
                            {last.response_status != null ? ` (HTTP ${last.response_status})` : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-medium"
                        onClick={() => setEditEp(ep)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy?.startsWith("test")}
                        className="rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-medium"
                        onClick={() => void testWebhook(ep.id)}
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-500/40 px-3 py-1.5 text-[12px] text-red-300"
                        onClick={() => void deleteWebhook(ep.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[12px] font-medium text-[var(--workspace-accent)]"
                      onClick={() => {
                        const o = openRef[ep.id];
                        setOpenRef((prev) => ({ ...prev, [ep.id]: !o }));
                        if (!o && deliveries === undefined) void loadDeliveries(ep.id);
                      }}
                    >
                      {openRef[ep.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Recent deliveries
                    </button>
                    {openRef[ep.id] ? (
                      deliveries === "loading" ? (
                        <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">Loading…</p>
                      ) : Array.isArray(deliveries) && deliveries.length > 0 ? (
                        <ul className="mt-2 space-y-1.5 rounded-lg border border-[var(--workspace-border)]/50 p-2">
                          {deliveries.map((d) => (
                            <li key={d.id} className="text-[11px] font-mono text-[var(--workspace-muted-fg)]">
                              <span className="text-[var(--workspace-fg)]">{d.event_type}</span> ·{" "}
                              {d.delivered_at ? "ok" : d.failed_at ? "failed" : "retry"}{" "}
                              {d.response_status != null ? `· ${d.response_status}` : ""} · attempts {d.attempt_count}{" "}
                              · {new Date(d.created_at).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[12px] text-[var(--workspace-muted-fg)]">No deliveries yet.</p>
                      )
                    ) : null}
                  </div>
                </div>
              );
            })}
            {endpoints.length === 0 ? (
              <p className="text-[13px] text-[var(--workspace-muted-fg)]">No webhook endpoints yet.</p>
            ) : null}
          </div>

          <div className="mt-6 rounded-xl border border-[var(--workspace-border)]/70 bg-[var(--workspace-canvas)]/30 p-4">
            <p className="text-[13px] font-medium text-[var(--workspace-fg)]">Create endpoint</p>
            <input
              className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              placeholder="https://example.com/webhooks/route5"
              value={whUrl}
              onChange={(e) => setWhUrl(e.target.value)}
            />
            <input
              className="mt-2 w-full rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 px-3 py-2 text-[13px] text-[var(--workspace-fg)]"
              placeholder="Description (optional)"
              value={whDesc}
              onChange={(e) => setWhDesc(e.target.value)}
            />
            <p className="mt-3 text-[11px] font-medium text-[var(--workspace-muted-fg)]">Events</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {WEBHOOK_EVENT_TYPES.map((ev) => (
                <label key={ev} className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--workspace-fg)]">
                  <input
                    type="checkbox"
                    checked={whEvents[ev]}
                    onChange={(e) => setWhEvents((prev) => ({ ...prev, [ev]: e.target.checked }))}
                  />
                  <span className="font-mono text-[11px]">{ev}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={busy === "wh"}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--workspace-accent)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-accent-fg)] disabled:opacity-50"
              onClick={() => void createWebhook()}
            >
              {busy === "wh" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add endpoint
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[var(--workspace-accent)]" aria-hidden />
            <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">API reference</h2>
          </div>
          <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">
            Successful responses: <code className="font-mono text-[11px]">{"{ data, meta }"}</code>. Errors:{" "}
            <code className="font-mono text-[11px]">{"{ error: { code, message, details }, meta }"}</code>. Lists include{" "}
            <code className="font-mono text-[11px]">total</code>, <code className="font-mono text-[11px]">limit</code>,{" "}
            <code className="font-mono text-[11px]">offset</code> in <code className="font-mono text-[11px]">meta</code>.
          </p>
          <div className="mt-4 space-y-2">
            {refSections.map((r) => (
              <details key={r.id} className="group rounded-xl border border-[var(--workspace-border)]/60 bg-[var(--workspace-canvas)]/20">
                <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-[var(--workspace-fg)] marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--workspace-surface)]/80 px-2 py-0.5 font-mono text-[11px] text-[var(--workspace-accent)]">
                      {r.scope}
                    </span>
                    {r.title}
                  </span>
                </summary>
                <div className="border-t border-[var(--workspace-border)]/50 px-4 pb-4 pt-2">
                  <p className="text-[12px] text-[var(--workspace-muted-fg)]">{r.desc}</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--workspace-border)]/50 bg-black/30 p-3 text-[11px] leading-relaxed text-[var(--workspace-fg)]">
                    {r.curl}
                  </pre>
                  <button
                    type="button"
                    className="mt-2 text-[12px] font-medium text-[var(--workspace-accent)]"
                    onClick={() => copyText(r.curl)}
                  >
                    Copy curl
                  </button>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
      </>
      ) : null}
    </div>
  );
}
