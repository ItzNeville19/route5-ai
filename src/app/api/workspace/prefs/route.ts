import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { WorkspacePrefsV1 } from "@/lib/workspace-prefs";
import { publicWorkspaceError } from "@/lib/public-api-message";

export const runtime = "nodejs";

const META_KEY = "route5WorkspacePrefs" as const;

function isPlainPrefs(x: unknown): x is WorkspacePrefsV1 {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const raw = (user.privateMetadata as Record<string, unknown> | undefined)?.[META_KEY];
    const prefs = isPlainPrefs(raw) ? raw : {};
    return NextResponse.json({ prefs });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { prefs?: Partial<WorkspacePrefsV1> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = body.prefs;
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "prefs required" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const existing = (user.privateMetadata as Record<string, unknown> | undefined)?.[META_KEY];
    const base = isPlainPrefs(existing) ? existing : {};
    const merged: WorkspacePrefsV1 = { ...base, ...patch };
    await client.users.updateUser(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        [META_KEY]: merged,
      },
    });
    return NextResponse.json({ ok: true, prefs: merged });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
