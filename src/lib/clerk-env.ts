/** True when Clerk client SDK can load (marketing + app share this). */
export function hasClerkPublishableKey(): boolean {
  return Boolean(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  );
}

/** Server-side auth and `@clerk/nextjs/server` require this; without it Clerk throws on requests. */
export function hasClerkSecretKey(): boolean {
  return Boolean(
    typeof process !== "undefined" && process.env.CLERK_SECRET_KEY?.trim()
  );
}

/** Both keys present — safe to mount `ClerkProvider` and call `auth()` / `clerkClient()`. */
export function isClerkFullyConfigured(): boolean {
  return hasClerkPublishableKey() && hasClerkSecretKey();
}
