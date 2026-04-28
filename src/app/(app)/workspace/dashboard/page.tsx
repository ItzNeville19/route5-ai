import type { Metadata } from "next";
import ExecutiveDashboard from "@/components/workspace/ExecutiveDashboardNeo";

export const metadata: Metadata = {
  title: "Dashboard — Route5",
  description: "Executive execution health, trends, and team performance.",
};

export default function WorkspaceDashboardPage() {
  return <ExecutiveDashboard />;
}
