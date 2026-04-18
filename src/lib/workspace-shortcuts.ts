/**
 * Reference list for future palette expansion — core app is Desk + Overview + Settings only.
 */

import { deskUrl } from "@/lib/desk-routes";

export type WorkspaceShortcutAction = "palette" | "activityPanel";

export type WorkspaceShortcut =
  | {
      id: string;
      label: string;
      href: string;
    }
  | {
      id: string;
      label: string;
      action: WorkspaceShortcutAction;
    };

export const WORKSPACE_SHORTCUTS: WorkspaceShortcut[] = [
  { id: "s1", label: "Feed", href: "/feed" },
  { id: "s2", label: "Desk", href: deskUrl() },
  { id: "s3", label: "Settings", href: "/settings" },
  { id: "s4", label: "Connections", href: "/settings#connections" },
  { id: "s5", label: "New project", href: "/overview#new-project" },
  { id: "s6", label: "Command palette", action: "palette" },
  { id: "s7", label: "Plans & billing", href: "/account/plans" },
  { id: "s8", label: "Product (site)", href: "/product" },
  { id: "s9", label: "Privacy", href: "/privacy" },
  { id: "s10", label: "Contact", href: "/contact" },
];
