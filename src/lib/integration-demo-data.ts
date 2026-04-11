/**
 * When live vendor credentials aren’t present, Route5 still ships a complete,
 * Apple-style experience: real UI, sample rows, and working “import” that
 * feeds extractions — no API-key messaging in the product surface.
 */
import type { GitHubIssueRow } from "@/lib/github-api";
import type { LinearIssueRow } from "@/lib/linear-api";
import { formatIssueForExtraction } from "@/lib/linear-api";
import { parseGitHubIssueRef } from "@/lib/github-api";

export const DEMO_LINEAR_ISSUES: LinearIssueRow[] = [
  {
    id: "demo-linear-eng-120",
    identifier: "ENG-120",
    title: "Ship weekly digest emails",
    description:
      "## Context\nProduct managers miss updates when extractions complete.\n\n## Proposal\nSend a concise summary with deep links to the project run.",
    url: "https://linear.app/route5/issue/ENG-120",
    stateName: "In Progress",
    teamKey: "ENG",
    teamName: "Engineering",
  },
  {
    id: "demo-linear-des-14",
    identifier: "DES-14",
    title: "Audit Figma handoff copy",
    description:
      "## Review\nEnsure design QA notes map cleanly into extraction templates.",
    url: "https://linear.app/route5/issue/DES-14",
    stateName: "Todo",
    teamKey: "DES",
    teamName: "Design",
  },
  {
    id: "demo-linear-gtm-7",
    identifier: "GTM-7",
    title: "Launch checklist for enterprise pilots",
    description: "## Blockers\nSecurity review · success criteria · rollback plan.",
    url: "https://linear.app/route5/issue/GTM-7",
    stateName: "Backlog",
    teamKey: "GTM",
    teamName: "Go To Market",
  },
];

export const DEMO_GITHUB_ISSUES: GitHubIssueRow[] = [
  {
    id: 900_001,
    number: 42,
    title: "Improve first-run extraction success",
    body: "## Observed\nUsers paste once and stop.\n\n## Hypothesis\nTemplates + one-tap send increases completion.",
    htmlUrl: "https://github.com/route5-ai/platform/issues/42",
    state: "open",
    repoFullName: "route5-ai/platform",
  },
  {
    id: 900_002,
    number: 17,
    title: "Sidebar: pin projects above fold",
    body: "Match the muscle memory of modern chat apps.",
    htmlUrl: "https://github.com/route5-ai/workspace/issues/17",
    state: "open",
    repoFullName: "route5-ai/workspace",
  },
  {
    id: 900_003,
    number: 3,
    title: "Docs: clarify extraction vs chat",
    body: "Reduce confusion between Relay and project composer.",
    htmlUrl: "https://github.com/route5-ai/docs/issues/3",
    state: "closed",
    repoFullName: "route5-ai/docs",
  },
];

function pickLinearDemo(ref: string): LinearIssueRow {
  const u = ref.toUpperCase();
  const byIdent = DEMO_LINEAR_ISSUES.find(
    (i) => u.includes(i.identifier) || ref.includes(i.id)
  );
  return byIdent ?? DEMO_LINEAR_ISSUES[0]!;
}

export function demoLinearImport(ref: string): {
  issue: LinearIssueRow;
  bodyForExtraction: string;
} {
  const issue = pickLinearDemo(ref);
  const base = formatIssueForExtraction(issue);
  const note =
    ref.trim().length > 0
      ? `\n\n—\n_Walkthrough — you asked for: ${ref.trim().slice(0, 240)}_`
      : "";
  return {
    issue,
    bodyForExtraction: `${base}${note}`,
  };
}

function formatGithubExtraction(issue: GitHubIssueRow): string {
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

export function demoGitHubImport(ref: string): {
  issue: GitHubIssueRow;
  bodyForExtraction: string;
} {
  const parsed = parseGitHubIssueRef(ref);
  if (parsed && Number.isFinite(parsed.number) && parsed.number >= 1) {
    const repoFullName = `${parsed.owner}/${parsed.repo}`;
    const issue: GitHubIssueRow = {
      id: 800_000 + parsed.number,
      number: parsed.number,
      title: `Track work for ${repoFullName}#${parsed.number}`,
      body:
        "This is a **live-formatted preview** in your workspace. Run extraction on it like any other issue body.\n\nWhen your organization links GitHub, Route5 will pull the real thread here automatically.",
      htmlUrl: `https://github.com/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`,
      state: "open",
      repoFullName,
    };
    return {
      issue,
      bodyForExtraction:
        formatGithubExtraction(issue) +
        `\n\n—\n_Reference: ${ref.trim().slice(0, 280)}_`,
    };
  }
  const issue = DEMO_GITHUB_ISSUES[0]!;
  return {
    issue,
    bodyForExtraction:
      formatGithubExtraction(issue) +
      (ref.trim()
        ? `\n\n—\n_Preview reference: ${ref.trim().slice(0, 240)}_`
        : ""),
  };
}
