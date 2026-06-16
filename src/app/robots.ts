import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/admin", "/cabinet", "/auth", "/api"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "anthropic-ai", "PerplexityBot", "CCBot"],
        allow: "/",
        disallow: privatePaths
      }
    ],
    sitemap: siteUrl("/sitemap.xml").toString()
  };
}
