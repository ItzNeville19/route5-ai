"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCopy, ExternalLink, LayoutGrid, Loader2, RefreshCw } from "lucide-react";
import SendToProjectButton from "@/components/integrations/SendToProjectButton";
import { sanitizeIntegrationClientError } from "@/lib/client-integration-errors";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
export default function FigmaIntegrationPage() {
  const { pushToast } = useWorkspaceExperience();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [lastBody, setLastBody] = useState<string | null>(null);
  const [transportBody, setTransportBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/figma", { credentials: "same-origin" });
      const data = (await res.json()) as { configured?: boolean; error?: string };
      if (!res.ok) {
        setConfigured(false);
        setMessage(data.error ?? "Could not load.");
        return;
      }
      setConfigured(Boolean(data.configured));
      if (!data.configured) {
        setMessage(
          "Add FIGMA_ACCESS_TOKEN to your deployment to pull file text and comments automatically. Until then, paste manually on Desk."
        );
      }
    } catch {
      setMessage("Could not reach the Figma integration endpoint.");
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyBody(body: string) {
    setTransportBody(body);
    try {
      await navigator.clipboard.writeText(body);
      setLastBody("Copied to clipboard.");
      window.setTimeout(() => setLastBody(null), 4000);
    } catch {
      setLastBody("Select and copy manually if clipboard is blocked.");
    }
  }

  async function importFile() {
    setImportErr(null);
    setImporting(true);
    try {
      const res = await fetch("/api/integrations/figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ input: linkInput }),
      });
      const data = (await res.json()) as { bodyForExtraction?: string; error?: string; title?: string };
      if (!res.ok) {
        setImportErr(sanitizeIntegrationClientError(data.error ?? "Import failed."));
        return;
      }
      if (data.bodyForExtraction) {
        await copyBody(data.bodyForExtraction);
        pushToast(data.title ? `Loaded “${data.title}”.` : "Figma file loaded.", "success");
      }
    } catch {
      setImportErr("Network error.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] pb-24">
      <Link
        href="/settings#connections"
        className="text-[13px] font-medium text-[var(--workspace-muted-fg)] hover:text-[var(--workspace-fg)]"
      >
        ← Integrations
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">Figma</h1>
          {!loading ? (
            <p className="mt-2 max-w-lg text-[13px] text-[var(--workspace-muted-fg)]">
              {configured
                ? "Live — layers and comments import here; Open in Desk runs the design template on the same extraction pipeline as Overview."
                : "Set FIGMA_ACCESS_TOKEN for automatic pulls; until then, paste frames on Desk. Connectors always feed Desk first."}
            </p>
          ) : (
            <p className="mt-2 h-[1.25rem] text-[13px] text-transparent" aria-hidden>
              .
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SendToProjectButton
            body={transportBody}
            sourceLabel="Figma"
            deskPreset="design"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2 text-[13px] font-medium text-[var(--workspace-fg)] shadow-sm transition hover:bg-[var(--workspace-hover-elevate)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {message ? (
        <div className="mt-6 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/85 px-4 py-3 text-[13px] text-[var(--workspace-muted-fg)]">
          {sanitizeIntegrationClientError(message)}
        </div>
      ) : null}

      {lastBody ? (
        <p className="mt-6 text-[13px] font-medium text-[var(--workspace-accent)]">{lastBody}</p>
      ) : null}

      <section className="mt-10 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Import by file or design link</h2>
        <p className="mt-1 text-[13px] text-[var(--workspace-muted-fg)]">
          Paste a <span className="font-mono">figma.com/file/…</span>, <span className="font-mono">design/…</span>,{" "}
          <span className="font-mono">community/file/…</span> URL, or the raw file key. The token must be able to
          read that file.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://www.figma.com/design/…"
            className="min-h-[48px] flex-1 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 text-[15px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/20"
          />
          <button
            type="button"
            disabled={importing || !linkInput.trim()}
            onClick={() => void importFile()}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--workspace-accent)] px-6 text-[14px] font-semibold text-[var(--workspace-on-accent)] transition hover:bg-[var(--workspace-accent-hover)] disabled:opacity-40"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Fetch for Desk
          </button>
        </div>
        {importErr ? (
          <p className="mt-3 text-[13px] text-[var(--workspace-danger-fg)]" role="alert">
            {sanitizeIntegrationClientError(importErr)}
          </p>
        ) : null}
      </section>

      <div className="mt-10 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/60 p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Manual capture</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--workspace-muted-fg)]">
          If a file is private to another org or you prefer not to use the API, you can still paste comments and notes
          on Desk — same extraction pipeline.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://www.figma.com/developers/api#access-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
          >
            Figma API tokens
            <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </a>
          <Link
            href="/desk?preset=design"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--workspace-fg)] shadow-sm transition hover:border-[var(--workspace-accent)]/35"
          >
            <ClipboardCopy className="h-4 w-4 opacity-70" aria-hidden />
            Desk (design preset)
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-[13px]">
        <Link
          href="/marketplace/figma"
          className="inline-flex items-center gap-2 font-medium text-[var(--workspace-accent)] hover:underline"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          Marketplace listing
        </Link>
      </div>
    </div>
  );
}
