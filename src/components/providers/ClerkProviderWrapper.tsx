"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { hasClerkPublishableKey } from "@/lib/clerk-env";
import { useClerkRuntimeEnabled } from "@/components/providers/ClerkRuntimeProvider";

const clerkAppearance = {
  variables: {
    colorPrimary: "#7c9cff",
    colorBackground: "#0b1220",
    colorText: "#e5e7eb",
    colorTextSecondary: "#9ca3af",
    colorInputBackground: "#111827",
    colorInputText: "#f3f4f6",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "border border-white/10 bg-[#0b1220]/95 text-[#e5e7eb] shadow-2xl",
    headerTitle: "text-[#f9fafb]",
    headerSubtitle: "text-[#9ca3af]",
    socialButtonsBlockButton:
      "border border-white/10 bg-[#0f172a] text-[#e5e7eb] hover:bg-[#111c33]",
    formFieldInput:
      "border border-white/15 bg-[#111827] text-[#f3f4f6] placeholder:text-[#9ca3af]",
    formButtonPrimary:
      "bg-[#7c9cff] text-[#0b1220] hover:bg-[#93adff] focus-visible:ring-2 focus-visible:ring-[#7c9cff]",
    footerActionLink: "text-[#a5b4fc] hover:text-[#c7d2fe]",
    userButtonPopoverCard: "border border-white/10 bg-[#0b1220]/95 text-[#e5e7eb]",
    userButtonPopoverActionButton: "text-[#e5e7eb] hover:bg-white/10",
    userButtonPopoverActionButtonText: "text-[#e5e7eb]",
    userButtonPopoverFooter: "border-t border-white/10",
  },
} as const;

export default function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const clerkRuntimeOk = useClerkRuntimeEnabled();
  if (!clerkRuntimeOk || !hasClerkPublishableKey()) {
    return children;
  }
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/login"
      signUpUrl="/sign-up"
      afterSignOutUrl="/login?signedOut=1"
    >
      {children}
    </ClerkProvider>
  );
}
