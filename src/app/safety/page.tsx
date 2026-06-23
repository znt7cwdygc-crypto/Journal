import type { Metadata } from "next";
import { TopicLanding } from "@/components/topic-landing";
import { siteUrl } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Безопасность вебкам-модели",
  description: "Чек-листы безопасности, приватности, документов, выплат и проверки предложений.",
  alternates: { canonical: "/safety" }
};

export default function SafetyPage() {
  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Безопасность",
        "url": siteUrl("/safety").toString(),
        "isPartOf": { "@type": "WebSite", "name": "WebcamExpert Journal", "url": siteUrl("/").toString() }
      }) }} />
      <TopicLanding topic="Безопасность" title="Безопасность" description="Приватность, документы, договоренности, красные флаги вакансий и спокойные действия в спорных ситуациях." />
    </>
  );
}
