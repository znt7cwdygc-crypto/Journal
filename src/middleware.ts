import { NextRequest, NextResponse } from "next/server";
import { CITY_COOKIE } from "@/lib/city-constants";

const crawlerUserAgents = [
  "googlebot",
  "bingbot",
  "yandex",
  "duckduckbot",
  "baiduspider",
  "slurp",
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "anthropic-ai",
  "perplexitybot",
  "ccbot",
  "facebookexternalhit",
  "linkedinbot",
  "telegrambot",
  "twitterbot",
  "whatsapp"
];

function isCrawler(req: NextRequest) {
  const userAgent = req.headers.get("user-agent")?.toLowerCase() ?? "";
  return crawlerUserAgents.some((agent) => userAgent.includes(agent));
}

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const legacyNextAsset =
    path === "/_next/static/css/app/layout.css" ||
    path === "/_next/static/chunks/webpack.js" ||
    path === "/_next/static/chunks/main-app.js" ||
    path === "/_next/static/chunks/app-pages-internals.js" ||
    path === "/_next/static/chunks/app/layout.js" ||
    path === "/_next/static/chunks/app/page.js" ||
    path === "/_next/static/chunks/app/cabinet/page.js";

  if (legacyNextAsset) {
    const url = new URL(path.endsWith(".css") ? "/legacy-next-static.css" : "/legacy-next-static.js", req.url);
    return NextResponse.rewrite(url);
  }

  const skip =
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path === "/favicon.ico" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path === "/llms.txt" ||
    path === "/llms-full.txt" ||
    path === "/manifest.webmanifest" ||
    path === "/select-city";

  if (skip) return NextResponse.next();

  if (isCrawler(req)) return NextResponse.next();

  const city = req.cookies.get(CITY_COOKIE)?.value;
  if (!city) {
    const url = new URL("/select-city", req.url);
    url.searchParams.set("next", `${nextUrl.pathname}${nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
