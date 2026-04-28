import type { Metadata } from "next";
import AdminCommandCenter from "@/components/workspace/AdminCommandCenter";

export const metadata: Metadata = {
  title: "Dashboard — Route5",
  description: "Execution command center: attention, recovery queue, and team health.",
};

export default function WorkspaceDashboardPage() {
  return <AdminCommandCenter />;
}
