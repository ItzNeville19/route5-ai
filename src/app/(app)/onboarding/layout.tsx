import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Welcome — Route5",
  description:
    "Connect your stack, create a project, and capture your first decisions from text.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
