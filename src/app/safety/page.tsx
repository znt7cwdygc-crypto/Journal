import type { Metadata } from "next";
import { TopicLanding } from "@/components/topic-landing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Безопасность вебкам-модели",
  description: "Чек-листы безопасности, приватности, документов, выплат и проверки предложений.",
  alternates: { canonical: "/safety" }
};

export default function SafetyPage() {
  return <TopicLanding topic="Безопасность" title="Безопасность" description="Приватность, документы, договоренности, красные флаги вакансий и спокойные действия в спорных ситуациях." />;
}
