import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** Keep search engines out of private, transactional and technical URLs; point them at the sitemap. */
export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/cart", "/checkout", "/api/", "/login", "/register", "/forgot-password", "/reset-password", "/unsubscribe", "/auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
