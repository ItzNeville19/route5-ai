import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { publicWorkspaceError } from "@/lib/public-api-message";
import {
  createProjectForUser,
  listProjectsForUser,
} from "@/lib/workspace/store";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await listProjectsForUser(userId);
    return NextResponse.json({ projects });
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

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const project = await createProjectForUser(userId, name);
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json(
      { error: publicWorkspaceError(e) },
      { status: 503 }
    );
  }
}
