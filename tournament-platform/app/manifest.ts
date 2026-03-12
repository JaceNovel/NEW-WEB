import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KING League",
    short_name: "KING League",
    description: "L'ascension du ROI commence ici sur KING League, avec une installation web immediate et une base officielle mobile/desktop prete a etre packagee.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#050816",
    theme_color: "#050816",
    categories: ["games", "sports", "entertainment"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/pp1-removebg-preview%20(1).png",
        sizes: "312x259",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/Design%20sans%20titre%20(1).png",
        sizes: "800x800",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/Design%20sans%20titre%20(1).png",
        sizes: "800x800",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Classement",
        short_name: "Classement",
        url: "/classement",
      },
      {
        name: "Matchs",
        short_name: "Matchs",
        url: "/matchs",
      },
      {
        name: "Historique",
        short_name: "Historique",
        url: "/historique",
      },
    ],
  };
}