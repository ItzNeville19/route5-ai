"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { isPathAllowedByOrgPolicy } from "@/lib/org-ui-policy";

/**
 * Redirects non-admins off routes hidden by the org's UI policy (set by admins in Organization).
 */
export default function OrgRouteGuard() {
  const { user } = useUser();
  const { orgRole, orgUiPolicy, loadingOrganization } = useWorkspaceData();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (loadingOrganization) return;
    const memberHome = "/workspace/my-inbox";
    const isMember = orgRole === "member";
    const currentPath = pathname.split("?")[0];
    if (isMember) {
      if (currentPath === "/overview" || currentPath === "/leadership") {
        router.replace(memberHome);
        return;
      }
      const blockedForMembers = [
        "/workspace/org-feed",
        "/workspace/dashboard",
        "/workspace/assign-task",
        "/workspace/organization",
        "/workspace/team",
        "/workspace/billing",
      ];
      if (blockedForMembers.some((pfx) => currentPath === pfx || currentPath.startsWith(`${pfx}/`))) {
        router.replace(memberHome);
        return;
      }
    }
    const p = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (isPathAllowedByOrgPolicy(p, orgUiPolicy, orgRole, user?.id ?? null)) return;
    router.replace(memberHome);
  }, [loadingOrganization, orgRole, orgUiPolicy, pathname, router, searchParams, user?.id]);

  return null;
}
