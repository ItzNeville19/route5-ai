import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import MotionConfigProvider from "@/components/providers/MotionConfigProvider";
import ClerkProviderWrapper from "@/components/providers/ClerkProviderWrapper";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
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
    { media: "(prefers-color-scheme: light)", color: "#ececee" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="theme-glass-site min-h-full flex flex-col antialiased">
        <MotionConfigProvider>
          <ClerkProviderWrapper>
            <CommandPaletteProvider>{children}</CommandPaletteProvider>
          </ClerkProviderWrapper>
        </MotionConfigProvider>
      </body>
    </html>
  );
}
