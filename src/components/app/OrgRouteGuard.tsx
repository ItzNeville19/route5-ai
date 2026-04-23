"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";
import { isPathAllowedByOrgPolicy } from "@/lib/org-ui-policy";

/**
 * Redirects non-admins off routes hidden by the org's UI policy (set by admins in Organization).
 */
export default function OrgRouteGuard() {
  const { orgRole, orgUiPolicy, loadingOrganization } = useWorkspaceData();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (loadingOrganization) return;
    const p = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
    if (isPathAllowedByOrgPolicy(p, orgUiPolicy, orgRole)) return;
    router.replace("/overview");
  }, [loadingOrganization, orgRole, orgUiPolicy, pathname, router, searchParams]);

  return null;
}
