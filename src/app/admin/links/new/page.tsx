import type { Metadata } from "next";
import { createUsefulLinkAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { UsefulLinkForm } from "../_form";

export const metadata: Metadata = {
  title: "Админ — Новая ссылка",
  robots: { index: false, follow: false },
};

export default async function NewUsefulLinkPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Новая ссылка</h1>
      <UsefulLinkForm action={createUsefulLinkAction} />
    </div>
  );
}
