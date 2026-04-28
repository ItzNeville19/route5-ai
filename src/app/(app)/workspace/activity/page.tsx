import type { Metadata } from "next";
import ExecutionActivityLog from "@/components/workspace/ExecutionActivityLog";

export const metadata: Metadata = {
  title: "Activity — Route5",
  description: "Notifications and escalation timeline.",
};

export default function WorkspaceActivityPage() {
  return <ExecutionActivityLog />;
}
