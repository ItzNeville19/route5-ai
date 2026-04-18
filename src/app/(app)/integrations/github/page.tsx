"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCopy, ExternalLink, Inbox, Loader2, RefreshCw } from "lucide-react";
import SendToProjectButton from "@/components/integrations/SendToProjectButton";
import { sanitizeIntegrationClientError } from "@/lib/client-integration-errors";
import { useWorkspaceExperience } from "@/components/workspace/WorkspaceExperience";
import { pushDeskWithDraft } from "@/lib/integration-desk-navigation";
import { writeExtractionDraft } from "@/lib/workspace-bridge";

type Issue = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  state: string;
  repoFullName: string;
};

export default function GitHubIntegrationPage() {
  const router = useRouter();
  const { pushToast } = useWorkspaceExperience();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [refInput, setRefInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [lastBody, setLastBody] = useState<string | null>(null);
  const [transportBody, setTransportBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/github", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        previewMode?: boolean;
        issues?: Issue[];
        message?: string;
        error?: string;
      };
      setConfigured(Boolean(data.configured));
      setPreviewMode(Boolean(data.previewMode));
      if (!res.ok) {
        setIssues([]);
        setMessage(data.error ?? "Could not load.");
        return;
      }
      setIssues(data.issues ?? []);
      if (data.error) setMessage(data.error);
      else setMessage(data.message ?? null);
    } catch {
      setMessage("Could not reach the GitHub integration endpoint.");
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
      setLastBody("Copied.");
      window.setTimeout(() => setLastBody(null), 4000);
    } catch {
      setLastBody("Select and copy manually if clipboard is blocked.");
    }
  }

  async function importRef() {
    setImportErr(null);
    setImporting(true);
    try {
      const res = await fetch("/api/integrations/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ref: refInput }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        bodyForExtraction?: string;
        error?: string;
        previewMode?: boolean;
      };
      if (!res.ok) {
        setImportErr(sanitizeIntegrationClientError(data.error ?? "Import failed."));
        return;
      }
      if (data.bodyForExtraction) {
        await copyBody(data.bodyForExtraction);
        if (data.previewMode) {
          pushToast("Preview ready — send to a project below.", "success");
        }
      }
    } catch {
      setImportErr("Network error.");
    } finally {
      setImporting(false);
    }
  }

  async function copyIssueForExtraction(issue: Issue) {
    const body = [
      `GitHub ${issue.repoFullName}#${issue.number}`,
      issue.htmlUrl,
      `State: ${issue.state}`,
      "",
      `## ${issue.title}`,
      "",
      (issue.body ?? "").trim(),
    ]
      .filter((l) => l !== "")
      .join("\n");
    await copyBody(body);
  }

  function issueBodyForDesk(issue: Issue): string {
    return [
      `GitHub ${issue.repoFullName}#${issue.number}`,
      issue.htmlUrl,
      `State: ${issue.state}`,
      "",
      `## ${issue.title}`,
      "",
      (issue.body ?? "").trim(),
    ]
      .filter((l) => l !== "")
      .join("\n");
  }

  function openIssueInDesk(issue: Issue) {
    const body = issueBodyForDesk(issue);
    writeExtractionDraft(body, "GitHub");
    startTransition(() => {
      pushDeskWithDraft(router);
    });
    pushToast("Opening Desk…", "success");
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
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[var(--workspace-fg)]">
            GitHub issues
          </h1>
          {!loading ? (
            <p className="mt-2 max-w-lg text-[13px] text-[var(--workspace-muted-fg)]">
              {configured
                ? "Live — assigned issues sync here; send everything to Desk for extraction (same pipeline as Overview)."
                : "Ready — sample issues and URL import work now; add a token for live assigned issues. Desk is always the capture surface."}
            </p>
          ) : (
            <p className="mt-2 h-[1.25rem] text-[13px] text-transparent" aria-hidden>
              .
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SendToProjectButton body={transportBody} sourceLabel="GitHub" />
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
        <p className="mt-6 text-[14px] font-medium text-[var(--workspace-accent)]">{lastBody}</p>
      ) : null}

      {previewMode && !loading ? (
        <div className="mt-6 rounded-2xl border border-[var(--workspace-accent)]/25 bg-[var(--workspace-accent)]/8 px-4 py-3 text-[13px] leading-relaxed text-[var(--workspace-fg)]">
          <span className="font-semibold">Preview mode</span> — Sample issues only (GitHub token not set on this
          server). Fetch and copy still produces real extraction text; configure GitHub in your deployment to list and
          import assigned issues from your org.
        </div>
      ) : null}

      <section className="mt-10 rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Import by URL or ref</h2>
        <p className="mt-1 text-[13px] text-[var(--workspace-muted-fg)]">
          Paste a GitHub issue link or <span className="font-mono">owner/repo#123</span>. Then use{" "}
          <span className="font-medium text-[var(--workspace-fg)]">Open in Desk</span> — runs file to the project you
          choose on Desk.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            placeholder="https://github.com/org/repo/issues/42"
            className="min-h-[48px] flex-1 rounded-xl border border-[var(--workspace-border)] bg-[var(--workspace-canvas)] px-4 text-[15px] text-[var(--workspace-fg)] placeholder:text-[var(--workspace-muted-fg)] focus:border-[var(--workspace-accent)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--workspace-accent)]/20"
          />
          <button
            type="button"
            disabled={importing || !refInput.trim()}
            onClick={() => void importRef()}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--workspace-accent)] px-6 text-[14px] font-semibold text-white transition hover:bg-[var(--workspace-accent-hover)] disabled:opacity-40"
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

      <section className="mt-12">
        <h2 className="text-[15px] font-semibold text-[var(--workspace-fg)]">Assigned to you</h2>
        {loading ? (
          <div className="mt-8 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--workspace-muted-fg)]" aria-hidden />
          </div>
        ) : issues.length === 0 ? (
          <p className="mt-4 text-[13px] text-[var(--workspace-muted-fg)]">Nothing to show yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--workspace-border)] overflow-hidden rounded-2xl border border-[var(--workspace-border)] bg-[var(--workspace-surface)]/90">
            {issues.map((issue) => (
              <li
                key={`${issue.repoFullName}-${issue.number}`}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12px] text-[var(--workspace-accent)]">
                    {issue.repoFullName}#{issue.number}
                  </p>
                  <p className="mt-0.5 text-[15px] font-medium text-[var(--workspace-fg)]">{issue.title}</p>
                  <p className="mt-1 text-[12px] text-[var(--workspace-muted-fg)]">{issue.state}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openIssueInDesk(issue)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--workspace-fg)] px-3 py-2 text-[13px] font-semibold text-[var(--workspace-canvas)] transition hover:opacity-95"
                  >
                    <Inbox className="h-4 w-4" aria-hidden />
                    Open in Desk
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyIssueForExtraction(issue)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--workspace-border)] bg-[var(--workspace-surface)] px-3 py-2 text-[13px] font-semibold text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-hover-elevate)]"
                  >
                    <ClipboardCopy className="h-4 w-4" aria-hidden />
                    Copy text
                  </button>
                  <a
                    href={issue.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--workspace-border)] px-3 py-2 text-[13px] font-medium text-[var(--workspace-fg)] transition hover:bg-[var(--workspace-hover-elevate)]"
                  >
                    GitHub
                    <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-[12px] text-[var(--workspace-muted-fg)]">
        Same runs power{" "}
        <Link href="/overview" className="font-medium text-[var(--workspace-accent)] hover:underline">
          Overview
        </Link>{" "}
        metrics — Desk is where you capture and execute; projects stay the system of record.
      </p>
    </div>
  );
}
