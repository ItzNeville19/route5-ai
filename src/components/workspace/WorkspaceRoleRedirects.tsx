"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspaceData } from "@/components/workspace/WorkspaceData";

const ADMIN_ONLY_PREFIXES = ["/workspace/agent", "/workspace/escalations"];

/** Keeps employees off admin-only workspace routes (client-side; complements UI hiding). */
export default function WorkspaceRoleRedirects() {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const { orgRole, loadingOrganization } = useWorkspaceData();

  useEffect(() => {
    if (loadingOrganization) return;
    const canLead = orgRole === "admin" || orgRole === "manager";
    if (canLead) return;
    const hit = ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (!hit) return;
    const qs = search.toString();
    router.replace(qs ? `/workspace/dashboard?${qs}` : "/workspace/dashboard?view=employee");
  }, [loadingOrganization, orgRole, pathname, router, search]);

  return null;
}
