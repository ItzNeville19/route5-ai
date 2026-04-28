import { Barlow_Condensed, Outfit, Source_Serif_4 } from "next/font/google";

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

/** Long-form marketing (e.g. founder letter) — editorial serif */
export const sourceSerifEditorial = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-serif-editorial",
  display: "swap",
});
