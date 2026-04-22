import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import MotionConfigProvider from "@/components/providers/MotionConfigProvider";
import { ClerkRuntimeProvider } from "@/components/providers/ClerkRuntimeProvider";
import ClerkProviderWrapper from "@/components/providers/ClerkProviderWrapper";
import ChunkLoadRecovery from "@/components/providers/ChunkLoadRecovery";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { PublicI18nProvider } from "@/components/i18n/I18nProvider";
import { isClerkFullyConfigured } from "@/lib/clerk-env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Route5 | Execution clarity for teams that ship under scrutiny",
  description:
    "Committed owners, deadlines, and traceable completion—not another team chat inbox. 14-day trial, no card; contact us to align rollout and plan.",
  keywords: [
    "execution software",
    "commitment management",
    "enterprise accountability",
    "decision tracking",
    "operations",
    "COO tools",
    "Slack",
    "Notion",
  ],
  appleWebApp: {
    capable: true,
    title: "Route5",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
    { media: "(prefers-color-scheme: light)", color: "#0c0c0e" },
  ],
  /** Lets `env(safe-area-inset-*)` apply on notched phones (hero padding, auth footers). */
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkRuntimeOk = isClerkFullyConfigured();
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full font-sans antialiased`}
    >
      <body className="theme-glass-site min-h-full flex flex-col antialiased">
        <ClerkRuntimeProvider enabled={clerkRuntimeOk}>
          <MotionConfigProvider>
            <ClerkProviderWrapper>
              <ChunkLoadRecovery />
              <CommandPaletteProvider>
                <PublicI18nProvider>{children}</PublicI18nProvider>
              </CommandPaletteProvider>
            </ClerkProviderWrapper>
          </MotionConfigProvider>
        </ClerkRuntimeProvider>
      </body>
    </html>
  );
}
