import { requireUserId } from "@/lib/auth/require-user";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authz = await requireUserId();
  if (!authz.ok) return authz.response;
  void req;
  return NextResponse.json(
    {
      error: "Self-serve checkout is disabled. Contact neville@rayze.xyz to continue after trial.",
      contact: "neville@rayze.xyz",
    },
    { status: 403 }
  );
}
