import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/app-base-url";
import { hasClerkPublishableKey, hasClerkSecretKey, isClerkFullyConfigured } from "@/lib/clerk-env";

export const runtime = "nodejs";

export async function GET() {
  const origin = appBaseUrl();
  return NextResponse.json({
    ok: true,
    auth: {
      clerkPublishableKeyConfigured: hasClerkPublishableKey(),
      clerkSecretKeyConfigured: hasClerkSecretKey(),
      clerkReady: isClerkFullyConfigured(),
      canonicalOrigin: origin,
      loginUrl: `${origin}/login`,
      signUpUrl: `${origin}/sign-up`,
    },
    t: Date.now(),
  });
}
