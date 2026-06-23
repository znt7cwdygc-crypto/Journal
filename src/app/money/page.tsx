import type { Metadata } from "next";
import { TopicLanding } from "@/components/topic-landing";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Деньги в вебкам: доход, комиссии, выплаты",
  description: "Материалы про доход, комиссии, расходы, выплаты и финансовые решения в вебкам-индустрии.",
  alternates: { canonical: "/money" }
};

export default function MoneyPage() {
  return <TopicLanding topic="Деньги" title="Про деньги" description="Доход, комиссии, расходы на оборудование, выплаты и реальные финансовые разборы без обещаний." />;
}
