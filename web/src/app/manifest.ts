import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OKANELIFE — お金の人生を記録する",
    short_name: "OKANELIFE",
    description:
      "これまでの人生でいくら稼いだか。お金の記録を積み重ね、あとから振り返るためのライフログ。",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfaf5",
    theme_color: "#c9713f",
    orientation: "portrait",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
