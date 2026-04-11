/** True when Clerk client SDK can load (marketing + app share this). */
export function hasClerkPublishableKey(): boolean {
  return Boolean(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  );
}
