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
  { id: "s1", label: "Desk", href: deskUrl() },
  { id: "s2", label: "Settings", href: "/settings" },
  { id: "s3", label: "Connections", href: "/settings#connections" },
  { id: "s4", label: "New project", href: "/overview#new-project" },
  { id: "s5", label: "Command palette", action: "palette" },
  { id: "s6", label: "Plans & billing", href: "/account/plans" },
  { id: "s7", label: "Product (site)", href: "/product" },
  { id: "s8", label: "Privacy", href: "/privacy" },
  { id: "s9", label: "Contact", href: "/contact" },
];
