import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome — Route5",
  description:
    "Connect your stack, create a project, and run your first text extraction.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
