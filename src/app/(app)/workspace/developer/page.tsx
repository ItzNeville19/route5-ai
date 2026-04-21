import { redirect } from "next/navigation";
import { isDeveloperToolsEnabled } from "@/lib/feature-flags";
import WorkspaceDeveloperClient from "./WorkspaceDeveloperClient";

export default function WorkspaceDeveloperPage() {
  if (!isDeveloperToolsEnabled()) {
    redirect("/settings");
  }
  return <WorkspaceDeveloperClient />;
}
