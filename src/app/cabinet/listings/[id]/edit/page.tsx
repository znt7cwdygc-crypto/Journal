import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { deleteListingAction, toggleListingVisibilityAction, updateListingAction } from "@/app/actions";
import { ListingQuizForm } from "@/components/listing-quiz-form";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { listingSeoPath } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редактировать размещение",
  robots: { index: false, follow: false }
};

function parseDescription(description: string) {
  const values: Record<string, string> = {};

  for (const part of description.split(/\n{2,}/)) {
    const index = part.indexOf(":");
    if (index <= 0) continue;
    const label = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (label && value) values[label] = value;
  }

  return values;
}

function listingInitialValues(listing: {
  title: string;
  description: string;
  city: string | null;
  geoCode: string | null;
  employmentType: string | null;
  contact: string;
}) {
  const data = parseDescription(listing.description);

  return {
    title: listing.title,
    city: listing.city ?? "",
    geoCode: listing.geoCode ?? "",
    employmentType: listing.employmentType ?? "REMOTE",
    contact: listing.contact,
    description: data["Коротко"] ?? listing.description,
    vacancyRole: data["Роль"],
    price: data["Оплата"] ?? data["Цена"],
    priceComment: data["Комментарий к оплате"] ?? data["Комментарий к цене"],
    schedule: data["График"],
    workload: data["Занятость"],
    requirements: data["Требования"],
    benefits: data["Условия"] ? data["Условия"].split(",").map((item) => item.trim()).filter(Boolean) : [],
    benefitsOther: data["Дополнительные условия"],
    stopConditions: data["Кто не подойдет"] ?? data["Ограничения"],
    serviceCategory: data["Категория"],
    serviceIncludes: data["Что входит"],
    experience: data["Опыт"],
    portfolioUrl: data["Портфолио"],
    deliveryTime: data["Срок"],
    availability: data["Доступность"]
  };
}

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const listing = await prisma.listing.findFirst({ where: { id: params.id, createdById: user.id } });
  if (!listing) notFound();

  const isPublished = listing.status === "PUBLISHED";
  const kind = listing.type === "SERVICE" ? "SERVICE" : "VACANCY";

  return (
    <div className="page-stack">
      <section className="section-card">
        <Link className="text-sm font-semibold text-accent hover:text-teal-900" href="/cabinet#materials">
          Назад в Мое
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">{kind === "SERVICE" ? "Услуга" : "Вакансия"}</p>
            <h1 className="page-title mt-1">Редактировать размещение</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Тип фиксирован после создания. Все остальные поля можно обновить в том же квизе.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link className="btn btn-ghost" href={listingSeoPath(listing)}>
              Открыть
            </Link>
            <form action={toggleListingVisibilityAction}>
              <input type="hidden" name="listingId" value={listing.id} />
              <button className="btn btn-muted" type="submit">
                {isPublished ? "Скрыть" : "Опубликовать"}
              </button>
            </form>
            <form action={deleteListingAction}>
              <input type="hidden" name="listingId" value={listing.id} />
              <button className="btn btn-danger" type="submit">
                Удалить
              </button>
            </form>
          </div>
        </div>
      </section>

      <ListingQuizForm
        action={updateListingAction}
        kind={kind}
        listingId={listing.id}
        initialValues={listingInitialValues(listing)}
        submitLabel="Сохранить"
      />
    </div>
  );
}
