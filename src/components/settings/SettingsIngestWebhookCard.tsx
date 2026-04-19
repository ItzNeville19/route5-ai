"use client";

import { useEffect, useState } from "react";
import { Mail, Webhook } from "lucide-react";

type IngestInfo = {
  enabled: boolean;
  diagnostics?: {
    secretPresent?: boolean;
    secretLooksLikeTemplate?: boolean;
  };
  webhookUrl: string;
  method: string;
  auth: string;
  body: Record<string, string>;
};

type ForwardingInfo = {
  enabled: boolean;
  forwardingAddress: string;
  forwardingDomain: string;
};

export default function SettingsIngestWebhookCard() {
  const [info, setInfo] = useState<IngestInfo | null>(null);
  const [forwarding, setForwarding] = useState<ForwardingInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "curl" | "forwarding" | null>(null);

  const copyText = async (value: string, kind: "url" | "curl" | "forwarding") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ingest", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load ingest settings");
        return r.json() as Promise<IngestInfo>;
      })
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setErr("Could not load webhook settings.");
      });

    void fetch("/api/ingest/forwarding", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load forwarding settings");
        return r.json() as Promise<ForwardingInfo>;
      })
      .then((data) => {
        if (!cancelled) setForwarding(data);
      })
      .catch(() => {
        if (!cancelled) setErr((prev) => prev ?? "Could not load email forwarding settings.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="dashboard-home-card rounded-2xl border border-[var(--workspace-border)] p-5 sm:p-6"
      aria-labelledby="ingest-heading"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] text-[var(--workspace-accent)]">
          <Webhook className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="ingest-heading" className="text-[15px] font-semibold text-[var(--workspace-fg)]">
            Webhook input
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
            Send decisions into Route5 automatically from external tools like Zapier, Make, or Slack. Creates the same
            commitment rows as Desk — no browser session required.
          </p>
        </div>
      </div>

      {err ? (
        <p className="mt-4 text-[13px] text-amber-200/90" role="status">
          {err}
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/70 p-4">
        <div className="flex items-start gap-2">
          <Mail className="mt-0.5 h-4 w-4 text-[var(--workspace-accent)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
              Email forwarding
            </p>
            {!forwarding ? (
              <p className="mt-1 text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
            ) : (
              <>
                <p className="mt-1 text-[13px] text-[var(--workspace-muted-fg)]">
                  Forward any email thread containing decisions to this address.
                </p>
                <div className="mt-2 flex items-start gap-2">
                  <code className="block min-w-0 flex-1 break-all rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]">
                    {forwarding.forwardingAddress}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyText(forwarding.forwardingAddress, "forwarding")}
                    className="rounded-lg border border-[var(--workspace-border)] px-2.5 py-2 text-[12px] text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
                  >
                    {copied === "forwarding" ? "Copied" : "Copy"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!info ? (
        <p className="mt-4 text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
      ) : !info.enabled ? (
        <div className="mt-4 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)]/40 px-4 py-3 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          Webhook endpoint is temporarily unavailable in this environment. Use email forwarding for now, or open
          Developer for API docs and endpoint status.
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-[13px] leading-relaxed">
          <p className="text-[var(--workspace-muted-fg)]">
            <span className="font-medium text-emerald-300/90">Enabled</span> — POST JSON to the URL below with the
            secret in headers.
          </p>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
              Webhook URL
            </p>
            <div className="mt-1 flex items-start gap-2">
              <code className="block min-w-0 flex-1 break-all rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]">
                {info.webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => void copyText(info.webhookUrl, "url")}
                className="rounded-lg border border-[var(--workspace-border)] px-2.5 py-2 text-[12px] text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
              >
                {copied === "url" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
              Headers
            </p>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-[var(--workspace-border)] bg-black/25 p-3 font-mono text-[11px] text-zinc-200">
              {`Authorization: Bearer <ROUTE5_INGEST_SECRET>\n# or\nX-Route5-Ingest-Secret: <ROUTE5_INGEST_SECRET>`}
            </pre>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
              Formats
            </p>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-[var(--workspace-border)] bg-black/25 p-3 font-mono text-[11px] text-zinc-200">
              {`JSON: { "projectId": "<uuid>", "text": "...", "source": "slack" }\nPlain text: send body text + ?projectId=<uuid>\nMultipart/form-data: projectId=<uuid>, text=..., source=email`}
            </pre>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--workspace-muted-fg)]">
              Example curl
            </p>
            <div className="mt-1 flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-[var(--workspace-border)] bg-black/25 p-3 font-mono text-[11px] text-zinc-200">
                {`curl -X POST "${info.webhookUrl}" \\\n  -H "Authorization: Bearer <ROUTE5_INGEST_SECRET>" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "projectId":"<uuid>",\n    "text":"Neville will send proposal by Friday",\n    "source":"slack"\n  }'`}
              </pre>
              <button
                type="button"
                onClick={() =>
                  void copyText(
                    `curl -X POST "${info.webhookUrl}" -H "Authorization: Bearer <ROUTE5_INGEST_SECRET>" -H "Content-Type: application/json" -d '{"projectId":"<uuid>","text":"Neville will send proposal by Friday","source":"slack"}'`,
                    "curl"
                  )
                }
                className="rounded-lg border border-[var(--workspace-border)] px-2.5 py-2 text-[12px] text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-nav-hover)]"
              >
                {copied === "curl" ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 text-[12px] text-[var(--workspace-muted-fg)]">
            Zapier and Make setup: trigger on new Slack/email event, map message body into <code>text</code>, set
            <code>projectId</code> to your target Route5 project, then POST to this webhook URL with the secret header.
          </div>
        </div>
      )}
    </section>
  );
}
