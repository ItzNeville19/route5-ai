import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/privacy(.*)",
  "/terms(.*)",
  "/login(.*)",
  "/sign-up(.*)",
  "/contact(.*)",
  "/pitch(.*)",
  "/pricing(.*)",
  /** Workspace UI gates with embedded Clerk client-side; APIs still require auth in handlers. */
  "/projects(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return;
  }
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
