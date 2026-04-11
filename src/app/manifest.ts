import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Route5 Workspace",
    short_name: "Route5",
    description:
      "Structured intelligence from enterprise text — projects, extractions, and workspace.",
    start_url: "/projects",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0c0c0e",
    theme_color: "#121214",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
