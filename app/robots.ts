import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/console", "/api/"],
    },
    sitemap: `${getSiteOrigin()}/sitemap.xml`,
  };
}
