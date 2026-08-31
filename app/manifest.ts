import type { MetadataRoute } from "next";

// PWA manifest — makes the app installable on mobile home screens.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Premier Data Training",
    short_name: "PD Training",
    description:
      "Premier Data training platform - elite-level learning and analysis.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#061020",
    theme_color: "#061020",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
