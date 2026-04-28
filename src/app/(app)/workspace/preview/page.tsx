import type { Metadata } from "next";
import EmployeePreviewPanel from "@/components/workspace/EmployeePreviewPanel";

export const metadata: Metadata = {
  title: "Employee preview — Route5",
  description: "Preview of what owners see for assigned commitments.",
};

export default function WorkspaceEmployeePreviewPage() {
  return <EmployeePreviewPanel />;
}
