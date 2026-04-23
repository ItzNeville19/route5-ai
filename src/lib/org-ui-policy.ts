/**
 * Which workspace areas non-admin users can access. Admins always see the full app.
 * Stored on `organizations.ui_policy` as JSON: `{ "nav": { "desk": false, ... } }`.
 * Omitted keys are treated as visible (true).
 */

export const ORG_NAV_KEYS = [
  "home",
  "desk",
  "tasks",
  "organization",
  "companies",
  "customize",
  "help",
  "settings",
  "billing",
] as const;

export type OrgNavKey = (typeof ORG_NAV_KEYS)[number];

export type OrgUiPolicy = {
  /** Full map: false hides a screen for non-admins. Home is always true. */
  nav: Record<OrgNavKey, boolean>;
};

const DEFAULT_TRUE: Record<OrgNavKey, true> = ORG_NAV_KEYS.reduce(
  (acc, k) => {
    acc[k] = true;
    return acc;
  },
  {} as Record<OrgNavKey, true>
);

export function defaultOrgUiPolicy(): OrgUiPolicy {
  return { nav: { ...DEFAULT_TRUE, home: true } as Record<OrgNavKey, boolean> };
}

export function parseOrgUiPolicy(raw: unknown): OrgUiPolicy {
  if (!raw || typeof raw !== "object") return defaultOrgUiPolicy();
  const nav = (raw as { nav?: unknown }).nav;
  if (!nav || typeof nav !== "object") return defaultOrgUiPolicy();
  const out: Record<OrgNavKey, boolean> = { ...DEFAULT_TRUE };
  for (const k of ORG_NAV_KEYS) {
    if (k === "home") {
      out.home = true;
      continue;
    }
    const v = (nav as Record<string, unknown>)[k];
    if (v === false) out[k] = false;
    else if (v === true) out[k] = true;
  }
  return { nav: out };
}

function normalizePolicyForStorage(policy: OrgUiPolicy): OrgUiPolicy {
  const base = defaultOrgUiPolicy();
  for (const k of ORG_NAV_KEYS) {
    if (k === "home") continue;
    if (policy.nav[k] === false) base.nav[k] = false;
  }
  base.nav.home = true;
  return base;
}

/** If every key is on, return null so the DB column can stay empty. */
export function orgUiPolicyToStorageJson(policy: OrgUiPolicy): string | null {
  const n = normalizePolicyForStorage(policy);
  const anyOff = ORG_NAV_KEYS.some((k) => n.nav[k] === false);
  if (!anyOff) return null;
  return JSON.stringify({ nav: n.nav });
}

export function isNavKeyVisible(
  key: OrgNavKey,
  policy: OrgUiPolicy,
  orgRole: "admin" | "manager" | "member" | null
): boolean {
  if (key === "home") return true;
  if (orgRole === "admin") return true;
  const v = policy.nav[key];
  if (v === false) return false;
  return true;
}

/**
 * Returns which nav "feature" a path maps to, or null for routes that are not part of
 * the admin visibility toggles (always allowed for all roles that can access the app).
 */
export function pathToOrgNavKey(pathname: string): OrgNavKey | null {
  const p = pathname.split("?")[0] ?? "";
  if (p === "/overview" || p === "/leadership" || p === "/workspace/my-inbox") return "home";
  if (p === "/desk" || p === "/feed") return "desk";
  if (
    p.startsWith("/workspace/commitments") ||
    p.startsWith("/workspace/team-work") ||
    p.startsWith("/workspace/org-feed") ||
    p.startsWith("/workspace/assign-task")
  ) return "tasks";
  if (p.startsWith("/workspace/organization") || p === "/workspace/team") return "organization";
  if (p.startsWith("/companies")) return "companies";
  if (p.startsWith("/workspace/customize")) return "customize";
  if (p.startsWith("/workspace/help")) return "help";
  if (p === "/settings" || p.startsWith("/settings/")) return "settings";
  if (p.startsWith("/workspace/billing")) return "billing";
  return null;
}

export function isPathAllowedByOrgPolicy(
  pathname: string,
  policy: OrgUiPolicy,
  orgRole: "admin" | "manager" | "member" | null
): boolean {
  const key = pathToOrgNavKey(pathname);
  if (key == null) return true;
  return isNavKeyVisible(key, policy, orgRole);
}
