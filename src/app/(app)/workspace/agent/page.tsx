import type { Metadata } from "next";
import ExecutionActionQueue from "@/components/workspace/ExecutionActionQueue";

export const metadata: Metadata = {
  title: "Assistant — Route 5",
  description: "Review reminders and flags for your team — edit messages and send when ready.",
};

export default function WorkspaceAgentPage() {
  return <ExecutionActionQueue />;
}
