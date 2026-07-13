import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const currentSiteUrl = siteUrl();
  if (currentSiteUrl.host !== "mycamdesk.com") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/"
      }
    };
  }

  const privatePaths = ["/admin", "/cabinet", "/auth", "/api"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "anthropic-ai", "PerplexityBot"],
        allow: "/",
        disallow: privatePaths
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: privatePaths
      },
      {
        userAgent: "CCBot",
        allow: "/",
        disallow: privatePaths
      }
    ],
    sitemap: currentSiteUrl.origin + "/sitemap.xml"
  };
}
