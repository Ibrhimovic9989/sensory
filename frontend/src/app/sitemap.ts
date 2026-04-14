import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: "https://sensory.mind.new",
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 1,
  }];
}
