import { Outfit } from "next/font/google";

/** Marketing homepage — thin weights, tight enterprise feel */
export const outfitLanding = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit-landing",
  display: "swap",
});
