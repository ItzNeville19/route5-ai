"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { hasClerkPublishableKey } from "@/lib/clerk-env";
import { route5ClerkAppearance } from "@/lib/clerk-appearance";
import { useClerkRuntimeEnabled } from "@/components/providers/ClerkRuntimeProvider";

export default function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const clerkRuntimeOk = useClerkRuntimeEnabled();
  if (!clerkRuntimeOk || !hasClerkPublishableKey()) {
    return children;
  }
  return (
    <ClerkProvider
      appearance={route5ClerkAppearance}
      signInUrl="/login"
      signUpUrl="/sign-up"
      afterSignOutUrl="/login?signedOut=1"
    >
      {children}
    </ClerkProvider>
  );
}
