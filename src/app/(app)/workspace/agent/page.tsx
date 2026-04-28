import type { Metadata } from "next";
import ExecutionActionQueue from "@/components/workspace/ExecutionActionQueue";

export const metadata: Metadata = {
  title: "Action Queue — Route5",
  description: "Execution recovery inbox — preview, approve, and send follow-ups.",
};

export default function WorkspaceAgentPage() {
  return <ExecutionActionQueue />;
}
