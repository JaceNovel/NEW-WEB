import type { MetadataRoute } from "next";

const baseUrl = "https://kingleague.space";

const routes = [
  "",
  "/inscription",
  "/login",
  "/matchs",
  "/classement",
  "/historique",
  "/credits",
  "/profile",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}