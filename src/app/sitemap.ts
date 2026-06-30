import type { MetadataRoute } from "next";

const BASE_URL = "https://padelmgt.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Public, indexable marketing/content pages. Auth, dashboard, SA back-office
  // and per-code private links are intentionally excluded (see robots.ts).
  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, changeFrequency: "daily" },
    { path: "/tournaments", priority: 0.9, changeFrequency: "daily" },
    { path: "/leagues", priority: 0.8, changeFrequency: "weekly" },
    { path: "/quick-games", priority: 0.7, changeFrequency: "daily" },
    { path: "/clubs", priority: 0.8, changeFrequency: "weekly" },
    { path: "/ranking", priority: 0.8, changeFrequency: "daily" },
    { path: "/calendar", priority: 0.6, changeFrequency: "daily" },
    { path: "/live-scores", priority: 0.7, changeFrequency: "hourly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "weekly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
  ];

  // Static tournament-format landing pages (SEO-valuable, prerendered).
  const formats = ["americano", "mexicano", "round-robin", "team-league", "knockout", "world-cup"];

  return [
    ...routes.map((r) => ({
      url: `${BASE_URL}${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...formats.map((f) => ({
      url: `${BASE_URL}/tournaments/${f}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
