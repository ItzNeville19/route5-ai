import type { Metadata } from "next";
import WorkspaceIntegrations from "@/components/workspace/WorkspaceIntegrations";

export const metadata: Metadata = {
  title: "Integrations — Route5",
  description: "Connect Slack and other tools to Route5.",
};

export default function WorkspaceIntegrationsPage() {
  return <WorkspaceIntegrations />;
}
