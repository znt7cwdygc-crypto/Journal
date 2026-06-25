import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateGuideAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { GuideForm } from "../_form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Редактирование гайда",
  robots: { index: false, follow: false },
};

export default async function EditGuidePage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN"]);
  const guide = await prisma.guide.findUnique({ where: { id: params.id } });
  if (!guide) notFound();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Редактирование: {guide.title}</h1>
      <GuideForm action={updateGuideAction} guide={guide} />
    </div>
  );
}
