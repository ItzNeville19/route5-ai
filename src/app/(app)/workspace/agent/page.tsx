import type { Metadata } from "next";
import AgentControlCenter from "@/components/workspace/AgentControlCenter";

export const metadata: Metadata = {
  title: "Agent — Route5",
  description: "Suggest, approve, and execute recovery actions from Route5 Agent.",
};

export default function WorkspaceAgentPage() {
  return <AgentControlCenter />;
}
