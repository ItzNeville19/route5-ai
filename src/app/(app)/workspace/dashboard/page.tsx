import type { Metadata } from "next";
import Route5AdminDashboard from "@/components/workspace/Route5AdminDashboard";

export const metadata: Metadata = {
  title: "Home — Route 5",
  description: "Your workspace home — team health, commitments, and quick links.",
};

export default function WorkspaceDashboardPage() {
  return <Route5AdminDashboard />;
}
