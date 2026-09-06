import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

/**
 * PWA manifest.
 *
 * `display: standalone` plus the shortcuts below are what make the installed
 * app feel like an app: it opens without browser chrome, and a long-press on
 * the home-screen icon jumps straight to recording an expense, which is the
 * one thing the user does several times a day.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — personal spending tracker`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    id: "/home",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f5f7",
    theme_color: "#0d9488",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add an expense", short_name: "Add expense", url: "/home?add=expense" },
      { name: "This month's insights", short_name: "Insights", url: "/insights" },
    ],
  };
}
