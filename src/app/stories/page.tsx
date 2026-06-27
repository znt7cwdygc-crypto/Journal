import type { Metadata } from "next";
import { TopicLanding } from "@/components/topic-landing";
import { siteUrl } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Истории вебкам-моделей и авторов",
  description: "Личные истории, опыт старта, ошибки и выводы участников вебкам-индустрии.",
  alternates: { canonical: "/stories" }
};

export default function StoriesPage() {
  return (
    <>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Истории",
        "url": siteUrl("/stories").toString(),
        "isPartOf": { "@type": "WebSite", "name": "MyCamDesk", "url": siteUrl("/").toString() }
      }) }} />
      <TopicLanding topic="Истории" title="Истории авторов" description="Личный опыт, честные разборы старта, работы со студиями, удаленного формата и первых решений." />
    </>
  );
}
