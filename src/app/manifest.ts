import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Route5 — Execution intelligence",
    short_name: "Route5",
    description:
      "Projects, structured extractions, decisions and actions — workspace intelligence from your data.",
    id: "/",
    start_url: "/desk",
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
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Overview", short_name: "Home", url: "/projects", description: "Workspace overview" },
      { name: "Desk", short_name: "Desk", url: "/desk", description: "Capture & extract" },
      { name: "Reports", short_name: "Reports", url: "/reports", description: "Execution snapshot" },
      { name: "Settings", short_name: "Settings", url: "/settings", description: "Account & workspace" },
    ],
  };
}
