import type { Metadata } from "next";
import { TopicLanding } from "@/components/topic-landing";
import { siteUrl } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Деньги в вебкам: доход, комиссии, выплаты",
  description: "Материалы про доход, комиссии, расходы, выплаты и финансовые решения в вебкам-индустрии.",
  alternates: { canonical: "/money" }
};

export default function MoneyPage() {
  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Про деньги",
        "url": siteUrl("/money").toString(),
        "isPartOf": { "@type": "WebSite", "name": "WebcamExpert Journal", "url": siteUrl("/").toString() }
      }) }} />
      <TopicLanding topic="Деньги" title="Про деньги" description="Доход, комиссии, расходы на оборудование, выплаты и реальные финансовые разборы без обещаний." />
    </>
  );
}
