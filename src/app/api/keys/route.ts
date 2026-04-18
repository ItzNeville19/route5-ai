import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ensureOrganizationForClerkUser } from "@/lib/workspace/org-bridge";
import { generateApiKey, hashApiKey, keyPrefixFromPlaintext } from "@/lib/public-api/keys";
import { insertApiKey, listApiKeysForOrg } from "@/lib/public-api/keys-store";
import type { ApiScope } from "@/lib/public-api/types";

export const runtime = "nodejs";

const postSchema = z
  .object({
    name: z.string().min(1).max(200),
    scopes: z.array(z.enum(["read", "write", "webhooks"])).min(1),
  })
  .strict();

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const keys = await listApiKeysForOrg(orgId);
    return NextResponse.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        key_prefix: k.keyPrefix,
        scopes: k.scopes,
        last_used_at: k.lastUsedAt,
        expires_at: k.expiresAt,
        revoked: k.revoked,
        created_at: k.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list keys" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const orgId = await ensureOrganizationForClerkUser(userId);
    const plain = generateApiKey();
    const hash = hashApiKey(plain);
    const prefix = keyPrefixFromPlaintext(plain);
    const scopes = parsed.data.scopes as ApiScope[];
    const row = await insertApiKey({
      orgId,
      name: parsed.data.name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes,
      createdBy: userId,
    });
    return NextResponse.json({
      id: row.id,
      key: plain,
      key_prefix: prefix,
      warning: "Save this key now — it will not be shown again.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
