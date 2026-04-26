"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

/**
 * Redirects non-admins off routes hidden by the org's UI policy (set by admins in Organization).
 */
export default function OrgRouteGuard() {
  const { loadingOrganization } = useWorkspaceData();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  useEffect(() => {
    if (loadingOrganization) return;
    const currentPath = pathname.split("?")[0];
    const deprecatedToDesk = ["/feed", "/workspace/commitments", "/capture", "/workspace/assign-task"];
    const deprecatedToHome = ["/workspace/org-feed", "/workspace/dashboard", "/leadership"];

    if (deprecatedToDesk.some((pfx) => currentPath === pfx || currentPath.startsWith(`${pfx}/`))) {
      router.replace("/desk");
      return;
    }
    if (deprecatedToHome.some((pfx) => currentPath === pfx || currentPath.startsWith(`${pfx}/`))) {
      router.replace("/overview");
      return;
    }
  }, [loadingOrganization, pathname, router]);

  return null;
}
