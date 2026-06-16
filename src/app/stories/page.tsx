import type { Metadata } from "next";
import { TopicLanding } from "@/components/topic-landing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Истории вебкам-моделей и авторов",
  description: "Личные истории, опыт старта, ошибки и выводы участников вебкам-индустрии.",
  alternates: { canonical: "/stories" }
};

export default function StoriesPage() {
  return <TopicLanding topic="Истории" title="Истории авторов" description="Личный опыт, честные разборы старта, работы со студиями, удаленного формата и первых решений." />;
}
