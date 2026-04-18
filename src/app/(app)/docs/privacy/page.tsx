import type { Metadata } from "next";
import { WorkspaceArticle } from "@/components/workspace/WorkspaceArticle";

export const metadata: Metadata = {
  title: "Privacy — Route5 workspace",
  description: "Workspace privacy summary with link to the full public policy.",
};

export default function DocsPrivacyWorkspacePage() {
  return (
    <WorkspaceArticle
      backHref="/docs"
      backLabel="Guides"
      kicker="Legal"
      title="Privacy (workspace)"
      intro="This is the in-workspace summary. The canonical legal text lives on the public site."
    >
      <ul className="list-disc space-y-2 pl-5 text-[14px]">
        <li>Authentication and profile data are handled by Clerk.</li>
        <li>Projects and captured decisions are stored per signed-in user (Supabase or embedded SQLite).</li>
        <li>Decision capture may call OpenAI when configured; otherwise a heuristic process executes on the server.</li>
      </ul>
      <p>
        <a
          href="/privacy"
          className="font-medium text-[var(--workspace-accent)] underline-offset-4 hover:underline"
        >
          Full privacy policy (public site) →
        </a>
      </p>
    </WorkspaceArticle>
  );
}
