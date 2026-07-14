import { siteUrl } from "@/lib/seo";

export const INDEXNOW_KEY = "wejournal-indexnow-key-2026";

function normalizeUrl(pathOrUrl: string) {
  if (!pathOrUrl) return null;

  try {
    return new URL(pathOrUrl).toString();
  } catch {
    return siteUrl(pathOrUrl).toString();
  }
}

export async function notifyIndexNow(pathsOrUrls: string | string[]) {
  if (process.env.DEPLOY_ENV !== "production") return;
  const productionSiteUrl = siteUrl();
  if (productionSiteUrl.host !== "mycamdesk.com") return;

  const urlList = (Array.isArray(pathsOrUrls) ? pathsOrUrls : [pathsOrUrls])
    .map(normalizeUrl)
    .filter((url): url is string => Boolean(url));

  if (urlList.length === 0) return;

  try {
    const response = await fetch("https://yandex.com/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: productionSiteUrl.host,
        key: INDEXNOW_KEY,
        keyLocation: siteUrl(`/${INDEXNOW_KEY}.txt`).toString(),
        urlList
      }),
      cache: "no-store"
    });

    if (!response.ok && response.status !== 202) {
      console.warn("IndexNow notification failed", response.status, await response.text().catch(() => ""));
    }
  } catch (error) {
    console.warn("IndexNow notification failed", error);
  }
}
