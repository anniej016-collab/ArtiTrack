import type { MetadataRoute } from "next";

/**
 * Lets the app be installed to a phone's home screen and open without browser
 * chrome. `standalone` is what makes it feel like an app rather than a tab.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ArtiTrack",
    short_name: "ArtiTrack",
    description: "The artists you follow, their releases, and what you've heard.",
    start_url: "/",
    display: "standalone",
    background_color: "#08070d",
    theme_color: "#08070d",
    icons: [
      // 512 covers every installability rule that asks for 192 or more, and
      // "any" lets a browser scale it wherever it likes.
      { src: "/icon", sizes: "512x512 192x192 any", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
