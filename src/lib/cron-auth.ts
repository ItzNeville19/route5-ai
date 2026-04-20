import { NextResponse } from "next/server";

/**
 * Guard for `/api/cron/*` routes (Vercel Cron, manual triggers, external schedulers).
 *
 * - When `CRON_SECRET` is set: requires `Authorization: Bearer <CRON_SECRET>` (Vercel injects this for scheduled cron invocations).
 * - When unset: only allowed in **non-production** Node env (local `next dev`). Production builds without a configured secret
 *   return **503** so these endpoints are never anonymously world-callable.
 */
export function requireCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Cron misconfigured: set CRON_SECRET (16+ random characters) in environment variables. Vercel will send it as Authorization: Bearer.",
      },
      { status: 503 }
    );
  }

  return null;
}
