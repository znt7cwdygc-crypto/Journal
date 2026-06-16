import type { Metadata } from "next";
import { TopicLanding } from "@/components/topic-landing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Работа в вебкам: вакансии, резюме, формат",
  description: "Материалы о работе, вакансиях, резюме, графике, студиях и удаленном формате.",
  alternates: { canonical: "/work" }
};

export default function WorkPage() {
  return <TopicLanding topic="Работа" title="Работа и формат" description="Вакансии, резюме, график, удаленка, студии, требования и вопросы перед стартом." />;
}
