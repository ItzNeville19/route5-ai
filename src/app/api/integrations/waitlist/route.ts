import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";
import { insertIntegrationWaitlistEmail } from "@/lib/workspace/sqlite";

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  const { userId } = authz;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body === "object" && body && "email" in body ? String((body as { email: unknown }).email) : "";
  const result = insertIntegrationWaitlistEmail(email, userId);
  if (result.ok === false) {
    if (result.error === "invalid") {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    return NextResponse.json({ error: "already_registered" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
