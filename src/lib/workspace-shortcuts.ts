/**
 * One-tap navigation — every entry maps to a real route or in-app action.
 * Shown in the workspace sidebar “App library” list.
 */

export type WorkspaceShortcutAction = "palette" | "relay" | "activityPanel";

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

/** Shortcuts — all map to real routes or in-app actions (App library). */
export const WORKSPACE_SHORTCUTS: WorkspaceShortcut[] = [
  { id: "s0", label: "App launcher", href: "/workspace/apps" },
  { id: "s0b", label: "Reports", href: "/reports" },
  { id: "s1", label: "Dashboard", href: "/projects" },
  { id: "s2", label: "New project", href: "/projects#new-project" },
  { id: "s3", label: "Desk", href: "/desk" },
  { id: "s4", label: "Marketplace", href: "/marketplace" },
  { id: "s5", label: "Guided setup", href: "/onboarding" },
  { id: "s6", label: "Integrations", href: "/integrations" },
  { id: "s6b", label: "Team insights", href: "/team-insights" },
  { id: "s7", label: "Linear", href: "/integrations/linear" },
  { id: "s8", label: "GitHub issues", href: "/integrations/github" },
  { id: "s9", label: "Figma", href: "/integrations/figma" },
  { id: "s9b", label: "Google Workspace", href: "/integrations/google" },
  { id: "s10", label: "Relay chat", action: "relay" },
  { id: "s11", label: "Command palette", action: "palette" },
  { id: "s12", label: "Activity panel", action: "activityPanel" },
  { id: "s13", label: "Settings", href: "/settings" },
  { id: "s14", label: "Plans & billing", href: "/account/plans" },
  { id: "s15", label: "Documentation", href: "/docs" },
  { id: "s16", label: "Product scope", href: "/docs/product" },
  { id: "s17", label: "Roadmap", href: "/docs/roadmap" },
  { id: "s18", label: "Boundaries", href: "/docs/boundaries" },
  { id: "s19", label: "Privacy", href: "/docs/privacy" },
  { id: "s20", label: "Terms", href: "/docs/terms" },
  { id: "s21", label: "Support", href: "/support" },
  { id: "s22", label: "Contact", href: "/contact" },
  { id: "s23", label: "Pricing", href: "/pricing" },
  { id: "s24", label: "Pitch", href: "/pitch" },
  { id: "s25", label: "Marketing home", href: "/" },
  { id: "s26", label: "Store · Linear", href: "/marketplace/linear" },
  { id: "s27", label: "Store · GitHub", href: "/marketplace/github-issues" },
  { id: "s28", label: "Store · Desk", href: "/marketplace/virtual-desk" },
  { id: "s29", label: "Store · Figma", href: "/marketplace/figma" },
  { id: "s30", label: "Store · Composer", href: "/marketplace/composer" },
  { id: "s31", label: "Store · Runs", href: "/marketplace/intelligence" },
  { id: "s32", label: "Store · Palette", href: "/marketplace/palette" },
  { id: "s33", label: "Store · Setup", href: "/marketplace/onboarding" },
  { id: "s34", label: "Store · Account", href: "/marketplace/settings" },
  { id: "s35", label: "Store · Docs pack", href: "/marketplace/documentation" },
  { id: "s36", label: "Palette deep link", href: "/projects?tool=palette" },
  { id: "s37", label: "Connection status", href: "/marketplace/health" },
];
