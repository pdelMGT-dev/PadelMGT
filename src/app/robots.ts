import type { MetadataRoute } from "next";

const BASE_URL = "https://padelmgt.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private / non-indexable areas: user dashboards, the SA back-office,
        // API routes, the PWA shell, and per-code private links.
        disallow: [
          "/api/",
          "/dashboard/",
          "/superadmin/",
          "/app/",
          "/offline",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
