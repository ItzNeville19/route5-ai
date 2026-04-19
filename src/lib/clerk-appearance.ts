/**
 * Dark, high-contrast auth UI for Route5.
 * Clerk v7+ expects `colorForeground` / `colorPrimaryForeground` / `colorInput` (older
 * `colorText` / `colorInputBackground` keys are deprecated and were causing near-black
 * text on black surfaces).
 */
export const route5ClerkAppearance = {
  baseTheme: "dark" as const,
  variables: {
    colorPrimary: "#fafafa",
    colorPrimaryForeground: "#0a0a0a",
    colorSuccess: "#22c55e",
    colorDanger: "#f87171",
    colorWarning: "#fbbf24",
    colorBackground: "#0a0a0a",
    colorForeground: "#fafafa",
    colorMutedForeground: "#a3a3a3",
    colorMuted: "rgba(255, 255, 255, 0.06)",
    colorNeutral: "#262626",
    colorBorder: "rgba(255, 255, 255, 0.12)",
    colorInput: "#141414",
    colorInputForeground: "#fafafa",
    colorRing: "rgba(255, 255, 255, 0.35)",
    colorModalBackdrop: "rgba(0, 0, 0, 0.65)",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "border border-white/[0.12] bg-[#0a0a0a] shadow-2xl shadow-black/60",
    card: "border border-white/[0.12] bg-[#0a0a0a] shadow-2xl shadow-black/60",
    headerTitle: "!text-[#fafafa] font-semibold tracking-[-0.02em]",
    headerSubtitle: "!text-neutral-400",
    socialButtonsBlockButton:
      "border border-white/15 !bg-[#141414] !text-[#fafafa] hover:!bg-[#1a1a1a] [&_.cl-socialButtonsBlockButtonText]:!text-[#fafafa]",
    socialButtonsBlockButtonText: "!text-[#fafafa] font-medium",
    dividerLine: "bg-white/10",
    dividerText: "!text-neutral-500",
    formFieldLabel: "!text-neutral-300",
    formFieldLabelRow: "!text-neutral-300",
    formFieldInput:
      "border border-white/15 !bg-[#141414] !text-[#fafafa] placeholder:!text-neutral-500 focus:border-white/35 focus:ring-1 focus:ring-white/20",
    formFieldInputShowPasswordButton: "text-neutral-400 hover:text-white",
    formButtonPrimary:
      "!bg-[#fafafa] !text-[#0a0a0a] font-semibold hover:!bg-white shadow-none border border-white/10",
    formButtonReset: "text-neutral-400 hover:text-white",
    footerAction: "!text-neutral-400",
    footerActionLink: "!text-[#fafafa] font-medium hover:underline",
    footerActionText: "!text-neutral-400",
    identityPreviewText: "!text-[#fafafa]",
    identityPreviewEditButton: "text-neutral-400 hover:text-white",
    formFieldSuccessText: "text-emerald-400",
    formFieldErrorText: "text-red-400",
    alertText: "text-red-300",
    otpCodeFieldInput: "border border-white/15 bg-[#141414] text-white",
    userButtonPopoverCard: "border border-white/10 bg-[#0a0a0a] text-[#fafafa]",
    userButtonPopoverActionButton:
      "!text-[#fafafa] !bg-transparent hover:!bg-white/10 [&_svg]:!text-[#fafafa] [&_svg]:!opacity-100 focus-visible:!ring-1 focus-visible:!ring-white/30",
    userButtonPopoverActionButtonText: "!text-[#fafafa]",
    userButtonPopoverActionButton__manageAccount:
      "!text-[#fafafa] hover:!bg-white/10 [&_svg]:!text-[#fafafa]",
    userButtonPopoverActionButton__signOut:
      "!text-[#fafafa] hover:!bg-white/10 [&_svg]:!text-[#fafafa]",
    userButtonPopoverFooter: "border-t border-white/10",
  },
} as const;
