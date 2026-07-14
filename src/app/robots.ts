import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // siteUrl() is built from NEXT_PUBLIC_SITE_URL, which is the same fixed value on
  // both prod and dev — it can't tell them apart. Use the actual request Host header
  // instead, otherwise dev.mycamdesk.com always gets prod's permissive robots.txt.
  const host = headers().get("host") || "";
  if (host !== "mycamdesk.com") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/"
      }
    };
  }

  const currentSiteUrl = siteUrl();
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
