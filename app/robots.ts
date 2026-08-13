import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://send-go.vercel.app").replace(
  /\/$/,
  ""
);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cuenta", "/perfil", "/auth/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
