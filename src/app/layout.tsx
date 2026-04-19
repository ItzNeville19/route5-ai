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
  title: "Route5 | Structured intelligence from enterprise text",
  description:
    "Paste notes and tickets into projects; get AI-generated summaries, decisions, and action items you can track. Honest roadmap for legacy automation.",
  keywords: [
    "enterprise AI",
    "legacy modernization",
    "MCP",
    "AI agents",
    "API generation",
    "business capabilities",
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
