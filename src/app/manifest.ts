import type { MetadataRoute } from "next";

import { PWA_BACKGROUND_COLOR, PWA_ICON_PATHS, PWA_THEME_COLOR_LIGHT } from "@/shared/lib/pwa-theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nextlevel",
    short_name: "Nextlevel",
    description: "Корпоративний портал Nextlevel",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR_LIGHT,
    lang: "uk",
    categories: ["business", "productivity"],
    icons: [
      {
        src: PWA_ICON_PATHS.icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICON_PATHS.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICON_PATHS.icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
