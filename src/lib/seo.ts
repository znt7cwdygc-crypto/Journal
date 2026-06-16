export const siteName = "WebcamExpert Journal";
export const siteDescription =
  "UGC-медиа о вебкам-индустрии: личный опыт, разборы, вакансии, резюме, услуги и экспертные материалы.";

export function siteUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(path, base);
}

export function truncateSeo(text: string, max = 155) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}
