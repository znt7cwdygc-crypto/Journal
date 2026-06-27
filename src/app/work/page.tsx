import type { Metadata } from "next";
import { TopicLanding } from "@/components/topic-landing";
import { siteUrl } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Работа в вебкам: вакансии, резюме, формат",
  description: "Материалы о работе, вакансиях, резюме, графике, студиях и удаленном формате.",
  alternates: { canonical: "/work" }
};

export default function WorkPage() {
  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Работа",
        "url": siteUrl("/work").toString(),
        "isPartOf": { "@type": "WebSite", "name": "MyCamDesk", "url": siteUrl("/").toString() }
      }) }} />
      <TopicLanding topic="Работа" title="Работа и формат" description="Вакансии, резюме, график, удаленка, студии, требования и вопросы перед стартом." />
    </>
  );
}
