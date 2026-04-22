import { Barlow_Condensed, Outfit } from "next/font/google";

/** Marketing homepage — readable body */
export const outfitLanding = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit-landing",
  display: "swap",
});

/** Stadium-board headlines — athletic B2B without generic “AI” typography */
export const barlowCondensedLanding = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow-condensed-landing",
  display: "swap",
});
