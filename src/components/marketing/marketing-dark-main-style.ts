import type { CSSProperties } from "react";

/**
 * Inline fallback so dark marketing pages always paint #09090f over body.theme-glass-site,
 * even when CSS cascade / preview tools drop utility backgrounds.
 */
export const marketingDarkMainStyle: CSSProperties = {
  backgroundColor: "#09090f",
  color: "#f4f4f5",
  minHeight: "100dvh",
  width: "100%",
};
