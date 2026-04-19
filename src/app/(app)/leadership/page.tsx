import { redirect } from "next/navigation";
import { getAuthUserIdSafe } from "@/lib/auth/require-user";
import { requireOrgRole } from "@/lib/workspace/org-members";

export default async function LeadershipAliasPage() {
  const userId = await getAuthUserIdSafe();
  if (!userId) redirect("/feed");
  const access = await requireOrgRole(userId, ["admin"]);
  if (!access.ok) {
    redirect("/feed");
  }
  redirect("/overview");
}
