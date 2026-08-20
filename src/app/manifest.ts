import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aangan Rooms",
    short_name: "Aangan",
    description: "Built in Kolhapur. Every room visited in person. No brokerage from students.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/logo-icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
