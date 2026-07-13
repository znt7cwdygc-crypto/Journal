import { NextResponse } from "next/server";
import { isCatalogEnabled } from "@/lib/features";
import { siteName, siteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export async function GET() {
  const body = [
    `# ${siteName} — Pricing`,
    "",
    "Machine-readable summary of paid features on MyCamDesk, a Russian-language UGC media and community platform for the webcam industry.",
    "",
    "## Free",
    "",
    "- Creating an account, browsing the site, reading articles and guides.",
    "- Posting a resume (model, operator, administrator, specialist).",
    "- Posting a vacancy, service listing, or marketplace product.",
    "- Browsing public resumes, vacancies, services, and products.",
    ...(isCatalogEnabled() ? ["- Listing a webcam studio or content-platform agency in the directory (/studios, /agencies) — free, moderated, no time limit while data stays current."] : []),
    "",
    "## Paid: contacting a resume (invite)",
    "",
    "Employers (studios, operators, agencies, specialists looking to hire) pay a one-time fee to send a direct invite/message to a public resume. The fee depends on the resume type:",
    "",
    "- Model resumes: $15 per invite.",
    "- Specialist resumes (operator, administrator, other roles): $5 per invite.",
    "",
    "Payment is made from a prepaid USD balance, topped up in the user's cabinet in any amount. The fee is charged only when an invite is actually sent, not for browsing resumes.",
    "",
    "## Not monetized",
    "",
    "- Advertising placements are sold off-platform by direct arrangement, not through a self-serve priced flow.",
    "- There is no subscription or membership fee for using the platform.",
    ...(isCatalogEnabled() ? ["- Paid directory promotion (featured placement for studios/agencies) is planned but not yet available."] : []),
    "",
    "Pricing last reviewed: " + new Date().toISOString().slice(0, 10),
    "Source: " + siteUrl("/pricing.md").toString(),
    ""
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
