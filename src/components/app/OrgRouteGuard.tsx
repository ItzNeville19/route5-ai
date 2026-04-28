"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

/**
 * Keeps legacy/deprecated workspace routes mapped to the MVP surface.
 */
export default function OrgRouteGuard() {
  const { loadingOrganization } = useWorkspaceData();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  useEffect(() => {
    if (loadingOrganization) return;
    const currentPath = pathname.split("?")[0];
    const target = "/workspace/dashboard";
    const deprecatedRoutes = [
      "/feed",
      "/workspace/commitments",
      "/capture",
      "/workspace/assign-task",
      "/workspace/org-feed",
      "/leadership",
      "/workspace/team-work",
      "/workspace/team",
      "/workspace/billing",
      "/workspace/apps",
      "/workspace/developer",
      "/workspace/escalations",
      "/workspace/audit",
      "/workspace/integrations",
      "/workspace/digest",
      "/workspace/my-inbox",
    ];

    if (currentPath === target) return;
    if (deprecatedRoutes.some((pfx) => currentPath === pfx || currentPath.startsWith(`${pfx}/`))) {
      router.replace(target);
      return;
    }
  }, [loadingOrganization, pathname, router]);

  return null;
}
