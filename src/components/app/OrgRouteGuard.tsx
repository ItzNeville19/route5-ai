"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

/**
 * Reserved for intentional sunset redirects. Workspace routes now ship as real pages — do not
 * blanket-redirect them or navigation buttons will appear “broken” (load then snap to dashboard).
 */
export default function OrgRouteGuard() {
  const { loadingOrganization } = useWorkspaceData();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  useEffect(() => {
    if (loadingOrganization) return;
    const currentPath = pathname.split("?")[0];
    const target = "/workspace/dashboard";
    /** Only routes we explicitly no longer serve as standalone surfaces (keep minimal). */
    const deprecatedRoutes: string[] = [];

    if (currentPath === target) return;
    if (deprecatedRoutes.some((pfx) => currentPath === pfx || currentPath.startsWith(`${pfx}/`))) {
      router.replace(target);
      return;
    }
  }, [loadingOrganization, pathname, router]);

  return null;
}
