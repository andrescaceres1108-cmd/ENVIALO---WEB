import type { MetadataRoute } from "next";
import { MODO_PRIVADO } from "@/lib/site-config";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://send-go.vercel.app").replace(
  /\/$/,
  ""
);

export default function robots(): MetadataRoute.Robots {
  if (MODO_PRIVADO) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cuenta", "/perfil", "/auth/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
