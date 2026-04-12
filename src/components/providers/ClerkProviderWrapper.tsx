"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { hasClerkPublishableKey } from "@/lib/clerk-env";

/** Light glass — variables only; avoid overriding card/rootBox so embedded SignIn/SignUp render reliably. */
const clerkAppearance = {
  variables: {
    colorPrimary: "#0071e3",
    colorBackground: "#f4f4f5",
    colorText: "#1d1d1f",
    colorTextSecondary: "#6e6e73",
    colorInputBackground: "rgba(255,255,255,0.95)",
    colorInputText: "#1d1d1f",
    borderRadius: "0.75rem",
  },
} as const;

/** Wraps the app once in root layout so marketing pages can use `SignedIn` / `UserButton` when Clerk is configured. */
export default function ClerkProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasClerkPublishableKey()) {
    return children;
  }
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/login"
      signUpUrl="/sign-up"
      /** After sign-out, land on the login screen — not the marketing homepage — so workspace sessions end cleanly. */
      afterSignOutUrl="/login?signedOut=1"
    >
      {children}
    </ClerkProvider>
  );
}
