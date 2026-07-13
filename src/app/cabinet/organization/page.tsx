import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { submitDirectoryProfileAction, upsertDirectoryProfileAction } from "@/app/actions";
import { DirectoryProfileForm } from "@/components/directory-profile-form";
import { isCatalogEnabled } from "@/lib/features";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Организация",
  robots: { index: false, follow: false }
};

const statusLabels: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Черновик — не отправлена на проверку", tone: "bg-zinc-100 text-zinc-700" },
  PENDING_REVIEW: { label: "На проверке у модератора", tone: "bg-amber-50 text-amber-800" },
  PUBLISHED: { label: "Опубликована в каталоге", tone: "bg-emerald-50 text-emerald-700" },
  CHANGES_REQUESTED: { label: "Нужны исправления", tone: "bg-red-50 text-hot" },
  HIDDEN: { label: "Скрыта модератором", tone: "bg-zinc-800 text-white" },
  ARCHIVED: { label: "В архиве", tone: "bg-zinc-100 text-zinc-500" }
};

export default async function OrganizationCabinetPage({ searchParams }: { searchParams?: { saved?: string; submitted?: string } }) {
  if (!isCatalogEnabled()) notFound();

  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { profileKind: true } });

  if (dbUser?.profileKind !== "STUDIO" && dbUser?.profileKind !== "AGENCY") {
    return (
      <div className="page-stack">
        <section className="section-card">
          <p className="eyebrow">Организация</p>
          <h1 className="page-title mt-1">Карточка в каталоге</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Карточку организации может создать только аккаунт с ролью «Студия / Агентство». Сменить роль можно в
            настройках профиля.
          </p>
        </section>
      </div>
    );
  }

  const isStudio = dbUser.profileKind === "STUDIO";
  const profile = await prisma.directoryProfile.findUnique({ where: { ownerId: user.id } });
  const status = profile ? statusLabels[profile.status] : null;

  return (
    <div className="page-stack">
      <section className="section-card">
        <Link className="text-sm font-semibold text-accent hover:text-teal-900" href="/cabinet">
          Назад в Кабинет
        </Link>
        <p className="eyebrow mt-3">Организация</p>
        <h1 className="page-title mt-1">Карточка {isStudio ? "студии" : "агентства"} в каталоге</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          Подробный профиль с процентом, условиями и командой — не короткая строка в каталоге, а полноценная
          страница. После заполнения карточка отправляется на проверку модератору.
        </p>
        {status && (
          <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>
            {status.label}
          </span>
        )}
        {profile?.status === "CHANGES_REQUESTED" && profile.rejectionReason && (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-hot">
            Комментарий модератора: {profile.rejectionReason}
          </p>
        )}
        {searchParams?.saved && <p className="mt-2 text-sm font-medium text-accent">Сохранено.</p>}
        {searchParams?.submitted && <p className="mt-2 text-sm font-medium text-accent">Отправлено на проверку.</p>}
      </section>

      <DirectoryProfileForm action={upsertDirectoryProfileAction} type={dbUser.profileKind} profile={profile} />

      {profile && profile.status !== "PUBLISHED" && profile.status !== "PENDING_REVIEW" && (
        <section className="section-card">
          <h2 className="section-title">Готовы отправить на проверку?</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Сначала сохраните форму выше, затем отправьте карточку модератору — без этого она не появится в каталоге.
          </p>
          <form action={submitDirectoryProfileAction} className="mt-3">
            <button className="btn btn-secondary" type="submit">Отправить на проверку</button>
          </form>
        </section>
      )}
    </div>
  );
}
