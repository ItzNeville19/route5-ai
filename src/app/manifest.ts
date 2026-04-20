import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Route5 — execution workspace",
    short_name: "Route5",
    description:
      "Execution you can see — owned commitments, Feed, Desk, and integrations from your data.",
    id: "/",
    start_url: "/desk",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0c0c0e",
    theme_color: "#6366f1",
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
      { name: "Desk", short_name: "Desk", url: "/desk", description: "Commitments & execution" },
      { name: "Capture", short_name: "Capture", url: "/capture", description: "Capture workspace" },
      { name: "Leadership", short_name: "Lead", url: "/overview", description: "Execution health" },
      { name: "Projects", short_name: "Projects", url: "/projects", description: "All projects" },
      { name: "Settings", short_name: "Settings", url: "/settings", description: "Account & connections" },
      { name: "Organization", short_name: "Org", url: "/workspace/organization", description: "People & access" },
    ],
  };
}
