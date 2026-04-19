import type { Metadata } from "next";
import WorkspaceOrganizationClient from "@/components/workspace/WorkspaceOrganizationClient";

export const metadata: Metadata = {
  title: "Organization — Route5",
  description: "Manage members, roles, and shared organization access.",
};

export default function WorkspaceOrganizationPage() {
  return <WorkspaceOrganizationClient />;
}
