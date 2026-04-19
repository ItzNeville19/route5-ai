"use client";

import { useEffect, useState } from "react";
import { Webhook } from "lucide-react";

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

export default function SettingsIngestWebhookCard() {
  const [info, setInfo] = useState<IngestInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

      {!info ? (
        <p className="mt-4 text-[13px] text-[var(--workspace-muted-fg)]">Loading…</p>
      ) : !info.enabled ? (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-[13px] leading-relaxed text-[var(--workspace-fg)]">
          <p className="font-medium">Not configured on this deployment</p>
          <p className="mt-2 text-[var(--workspace-muted-fg)]">
            Set the environment variable{" "}
            <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px]">ROUTE5_INGEST_SECRET</code>{" "}
            in your production deployment environment (for example, Vercel Project Settings), use a long random value,
            then restart/redeploy so this panel can show the live webhook URL.
          </p>
          {info.diagnostics?.secretLooksLikeTemplate ? (
            <p className="mt-2 text-[var(--workspace-muted-fg)]">
              A value is present, but it looks like a placeholder. Replace it with a real secret string before using
              this endpoint.
            </p>
          ) : null}
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
            <code className="mt-1 block break-all rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-3 py-2 font-mono text-[12px] text-[var(--workspace-fg)]">
              {info.webhookUrl}
            </code>
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
              Body (JSON)
            </p>
            <pre className="mt-1 overflow-x-auto rounded-lg border border-[var(--workspace-border)] bg-black/25 p-3 font-mono text-[11px] text-zinc-200">
              {`{\n  "projectId": "<uuid from your project URL>",\n  "text": "Paste thread or meeting notes here",\n  "source": "slack"\n}`}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
