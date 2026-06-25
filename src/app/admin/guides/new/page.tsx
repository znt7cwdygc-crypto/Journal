import type { Metadata } from "next";
import { createGuideAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { GuideForm } from "../_form";

export const metadata: Metadata = {
  title: "Админ — Новый гайд",
  robots: { index: false, follow: false },
};

export default async function NewGuidePage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-zinc-900">Новый гайд</h1>
      <GuideForm action={createGuideAction} />
    </div>
  );
}
