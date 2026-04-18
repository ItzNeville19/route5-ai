/**
 * Command palette / deep links — execution tracking only (Desk, Overview, Settings).
 */

import { deskUrl } from "@/lib/desk-routes";

export type WorkspaceAppTile = {
  href: string;
  label: string;
  description: string;
  group: "Work" | "Account";
};

export const WORKSPACE_APP_TILES: WorkspaceAppTile[] = [
  {
    group: "Work",
    href: deskUrl(),
    label: "Desk",
    description: "Capture text and track commitments",
  },
  {
    group: "Work",
    href: "/overview",
    label: "Overview",
    description: "Execution health and project list",
  },
  {
    group: "Account",
    href: "/settings#connections",
    label: "Connections",
    description: "Optional Linear, GitHub, …",
  },
  {
    group: "Account",
    href: "/settings",
    label: "Settings",
    description: "Profile and workspace",
  },
];
