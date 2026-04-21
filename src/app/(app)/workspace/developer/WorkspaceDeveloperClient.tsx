"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Copy, Mail, Webhook } from "lucide-react";

type IngestInfo = { webhookUrl?: string };
type ForwardingInfo = { forwardingAddress?: string };

function copyText(text: string) {
  if (!text) return;
  void navigator.clipboard.writeText(text);
}

export default function WorkspaceDeveloperClient() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [forwardingAddress, setForwardingAddress] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [copied, setCopied] = useState<"webhook" | "forwarding" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
    let cancelled = false;
    void (async () => {
      try {
        const [ingestRes, forwardingRes] = await Promise.all([
          fetch("/api/ingest", { credentials: "same-origin" }),
          fetch("/api/ingest/forwarding", { credentials: "same-origin" }),
        ]);
        const ingest = (await ingestRes.json().catch(() => ({}))) as IngestInfo;
        const forwarding = (await forwardingRes.json().catch(() => ({}))) as ForwardingInfo;
        if (cancelled) return;
        setWebhookUrl(ingest.webhookUrl ?? "");
        setForwardingAddress(forwarding.forwardingAddress ?? "");
      } catch {
        if (cancelled) return;
        setWebhookUrl("");
        setForwardingAddress("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apiExamples = useMemo(
    () => [
      {
        title: "List commitments",
        command: `curl -sS -H "Authorization: Bearer <API_KEY>" "${baseUrl || "https://your-app.com"}/api/v1/commitments?status=active&limit=50"`,
      },
      {
        title: "Create commitment",
        command: `curl -sS -X POST -H "Authorization: Bearer <API_KEY>" -H "Content-Type: application/json" -d '{"title":"Ship Q2","description":"","owner_id":"<user_id>","deadline":"2026-12-31","priority":"high"}' "${baseUrl || "https://your-app.com"}/api/v1/commitments"`,
      },
      {
        title: "Get dashboard",
        command: `curl -sS -H "Authorization: Bearer <API_KEY>" "${baseUrl || "https://your-app.com"}/api/v1/dashboard"`,
      },
      {
        title: "Send product update campaign (admin session)",
        command: `curl -sS -X POST -H "Content-Type: application/json" --cookie "YOUR_SESSION_COOKIE" -d '{"type":"marketing_product_updates","title":"April release now live","body":"You now have real-time org invites, faster chat sync, and richer daily digests.","ctaLabel":"Open changelog","ctaUrl":"${baseUrl || "https://your-app.com"}/product","inApp":true,"email":true}' "${baseUrl || "https://your-app.com"}/api/workspace/notifications/campaign"`,
      },
      {
        title: "Trigger login security alert (signed-in)",
        command: `curl -sS -X POST --cookie "YOUR_SESSION_COOKIE" "${baseUrl || "https://your-app.com"}/api/notifications/login-alert"`,
      },
    ],
    [baseUrl]
  );

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-6 pb-24">
      <div>
        <Link
          href="/settings"
          className="text-[13px] font-medium text-[var(--workspace-muted-fg)] transition hover:text-[var(--workspace-fg)]"
        >
          ← Settings
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-[var(--workspace-fg)]">Developer</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Webhook endpoint, forwarding address, and API reference for Route5 integrations.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-[var(--workspace-accent)]" />
          <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Webhook URL</h2>
        </div>
        <p className="mt-3 break-all rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/30 px-3 py-2 font-mono text-[13px] text-[var(--workspace-fg)]">
          {webhookUrl || "Loading…"}
        </p>
        <button
          type="button"
          onClick={() => {
            copyText(webhookUrl);
            setCopied("webhook");
            window.setTimeout(() => setCopied(null), 1200);
          }}
          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]/30"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied === "webhook" ? "Copied" : "Copy"}
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-[var(--workspace-accent)]" />
          <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Forwarding address</h2>
        </div>
        <p className="mt-3 break-all rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/30 px-3 py-2 font-mono text-[13px] text-[var(--workspace-fg)]">
          {forwardingAddress || "Loading…"}
        </p>
        <button
          type="button"
          onClick={() => {
            copyText(forwardingAddress);
            setCopied("forwarding");
            window.setTimeout(() => setCopied(null), 1200);
          }}
          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] px-3 py-1.5 text-[12px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-canvas)]/30"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied === "forwarding" ? "Copied" : "Copy"}
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5">
        <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">API documentation</h2>
        <p className="mt-2 text-[13px] text-[var(--workspace-muted-fg)]">
          Use <code className="font-mono text-[11px]">Authorization: Bearer &lt;API_KEY&gt;</code> on all{" "}
          <code className="font-mono text-[11px]">/api/v1/*</code> endpoints. Session-authenticated workspace routes are
          available for campaign and security notification tooling.
        </p>
        <div className="mt-4 space-y-3">
          {apiExamples.map((example) => (
            <details
              key={example.title}
              className="rounded-xl border border-[var(--workspace-border)]/70 bg-[var(--workspace-canvas)]/25"
            >
              <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium text-[var(--workspace-fg)]">
                {example.title}
              </summary>
              <div className="border-t border-[var(--workspace-border)]/50 px-4 py-3">
                <pre className="overflow-x-auto rounded-lg border border-[var(--workspace-border)]/60 bg-black/25 p-3 text-[11px] text-[var(--workspace-fg)]">
                  {example.command}
                </pre>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
