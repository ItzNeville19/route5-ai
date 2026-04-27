import { isClerkFullyConfigured } from "@/lib/clerk-env";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";

/**
 * Next.js 16+ `proxy.ts` runs before every matched request. A static
 * `clerkMiddleware()` export initializes Clerk immediately and throws when
 * `CLERK_SECRET_KEY` is missing (e.g. standalone without env). Lazily require
 * Clerk only when both keys are present.
 */
let clerkProxyHandler: NextMiddleware | undefined;

function resolveClerkProxy(): NextMiddleware {
  if (!clerkProxyHandler) {
    const { clerkMiddleware, createRouteMatcher } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@clerk/nextjs/server") as typeof import("@clerk/nextjs/server");

    const isPublicRoute = createRouteMatcher([
      "/",
      "/privacy(.*)",
      "/terms(.*)",
      "/login(.*)",
      "/sign-up(.*)",
      "/contact(.*)",
      "/product(.*)",
      "/pricing(.*)",
      "/download(.*)",
      "/trust(.*)",
      "/benefits(.*)",
      /** Guides & support — readable signed out (see `PublicWorkspaceGuideShell`, `public-site-paths.ts`). */
      "/docs(.*)",
      "/support(.*)",
      /** Workspace UI gates with embedded Clerk client-side; APIs still require auth in handlers. */
      "/projects(.*)",
      "/companies(.*)",
      "/overview(.*)",
      "/feed(.*)",
      "/desk(.*)",
    ]);

    clerkProxyHandler = clerkMiddleware(async (auth, req) => {
      if (isPublicRoute(req)) {
        return;
      }
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return;
      }
      await auth.protect();
    });
  }
  return clerkProxyHandler;
}

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!isClerkFullyConfigured()) {
    return NextResponse.next();
  }
  return resolveClerkProxy()(request, event);
}

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
