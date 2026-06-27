import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateUsefulLinkAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { UsefulLinkForm } from "../_form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ — Редактирование ссылки",
  robots: { index: false, follow: false },
};

export default async function EditUsefulLinkPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN"]);
  const link = await prisma.usefulLink.findUnique({ where: { id: params.id } });
  if (!link) notFound();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Редактирование: {link.title}</h1>
      <UsefulLinkForm action={updateUsefulLinkAction} link={link} />
    </div>
  );
}
