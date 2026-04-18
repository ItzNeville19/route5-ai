import { clerkClient } from "@clerk/nextjs/server";

export async function resolveOwnerDisplayNames(ownerIds: string[]): Promise<Map<string, string>> {
  const client = await clerkClient();
  const map = new Map<string, string>();
  await Promise.all(
    ownerIds.map(async (id) => {
      try {
        const u = await client.users.getUser(id);
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
          u.primaryEmailAddress?.emailAddress ||
          id;
        map.set(id, name);
      } catch {
        map.set(id, id.length > 10 ? `…${id.slice(-8)}` : id);
      }
    })
  );
  return map;
}
