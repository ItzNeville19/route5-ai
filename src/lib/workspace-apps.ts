/**
 * Tiles for the workspace “app launcher” — one grid, every entry is a real route.
 */

import { deskUrl } from "@/lib/desk-routes";

export type WorkspaceAppTile = {
  href: string;
  label: string;
  description: string;
  group: "Work" | "Reports" | "Connections" | "Workspace";
};

export const WORKSPACE_APP_TILES: WorkspaceAppTile[] = [
  {
    group: "Work",
    href: deskUrl(),
    label: "Desk",
    description: "Capture and run extractions",
  },
  { group: "Work", href: "/projects", label: "Projects", description: "Overview and list" },
  { group: "Reports", href: "/reports", label: "Reports", description: "Counts and recent runs" },
  { group: "Connections", href: "/integrations", label: "Integrations hub", description: "All connection routes" },
  { group: "Connections", href: "/integrations/linear", label: "Linear", description: "Issues and imports" },
  { group: "Connections", href: "/integrations/github", label: "GitHub", description: "Issues by URL" },
  { group: "Connections", href: "/integrations/figma", label: "Figma", description: "Design reviews" },
  { group: "Connections", href: "/integrations/google", label: "Google Workspace", description: "Docs & mail context" },
  { group: "Workspace", href: "/workspace/customize", label: "Dashboard layout", description: "Subtitle and Jump links" },
  { group: "Workspace", href: "/team-insights", label: "Team insights", description: "Shared visibility" },
  { group: "Workspace", href: "/marketplace", label: "Marketplace", description: "Install routes" },
  { group: "Workspace", href: "/settings#workspace-prefs", label: "Time & calendar", description: "Timezone — in Settings" },
  { group: "Workspace", href: "/settings", label: "Account", description: "Profile and security" },
];
