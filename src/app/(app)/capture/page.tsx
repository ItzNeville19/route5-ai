import type { Metadata } from "next";
import CapturePageClient from "@/components/capture/CapturePageClient";

export const metadata: Metadata = {
  title: "Capture",
  description: "Capture operational text into commitments",
};

/** Opens the floating capture panel; full dedicated Capture UI ships later. */
export default function CapturePage() {
  return <CapturePageClient />;
}
