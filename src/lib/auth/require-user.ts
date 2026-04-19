import { NextResponse } from "next/server";
import { isClerkFullyConfigured } from "@/lib/clerk-env";

export type RequireUserIdResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Clerk `auth()` can throw when keys are missing or the auth service errors.
 * Use this instead of bare `auth()` in Route Handlers so callers get 401/503 JSON instead of a 500.
 *
 * `@clerk/nextjs/server` is loaded dynamically so missing `CLERK_SECRET_KEY` does not crash module init.
 */
export async function requireUserId(): Promise<RequireUserIdResult> {
  if (!isClerkFullyConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication is not configured on this server" },
        { status: 503 }
      ),
    };
  }
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return { ok: true, userId };
  } catch (e) {
    console.error("[requireUserId] Clerk auth() failed", e);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication temporarily unavailable" },
        { status: 503 }
      ),
    };
  }
}

/** Server Components / RSC: never throw; callers treat null as signed out. */
export async function getAuthUserIdSafe(): Promise<string | null> {
  if (!isClerkFullyConfigured()) {
    return null;
  }
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId ?? null;
  } catch (e) {
    console.error("[getAuthUserIdSafe] Clerk auth() failed", e);
    return null;
  }
}

/**
 * OAuth-style GET handlers that must redirect unauthenticated users to login.
 * On Clerk infrastructure errors, returns 503 JSON (rare).
 */
export async function requireUserIdRedirect(redirectTo: URL): Promise<RequireUserIdResult> {
  if (!isClerkFullyConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication is not configured on this server" },
        { status: 503 }
      ),
    };
  }
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) {
      return { ok: false, response: NextResponse.redirect(redirectTo) };
    }
    return { ok: true, userId };
  } catch (e) {
    console.error("[requireUserIdRedirect] Clerk auth() failed", e);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication temporarily unavailable" },
        { status: 503 }
      ),
    };
  }
}
