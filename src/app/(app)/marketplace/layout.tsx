import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace — Route5",
  description:
    "Marketplace catalog: built-in desk apps, live stack status, and roadmap integrations — one workspace.",
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
