import type { Metadata } from "next";
import WorkspaceTeamClient from "@/components/workspace/WorkspaceTeamClient";

export const metadata: Metadata = {
  title: "Team — Route5",
  description: "Organization and people who own commitments in your workspace.",
};

export default function WorkspaceTeamPage() {
  return <WorkspaceTeamClient />;
}
