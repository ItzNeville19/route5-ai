import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { insertIntegrationWaitlistEmail } from "@/lib/workspace/sqlite";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
