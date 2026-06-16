import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ContentSort } from "@/components/content-sort";
import { ListingDirectoryCard } from "@/components/directory-card";
import { serviceTopic } from "@/lib/topics";
import { getSelectedCity, getCityMeta } from "@/lib/city";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Услуги",
  description: "Каталог услуг, экспертов и консультаций WebcamExpert для моделей, студий и команд.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Услуги WebcamExpert",
    description: "Эксперты, сервисы и консультации для участников индустрии.",
    url: "/services"
  }
};

const sortOptions = [
  { key: "new", label: "Новые" },
  { key: "views", label: "Популярные" },
  { key: "responses", label: "По откликам" }
];

export default async function ServicesPage({ searchParams }: { searchParams?: { sort?: string; reported?: string } }) {
  const session = await auth();
  const sort = searchParams?.sort || "new";
  const currentPath = sort === "new" ? "/services" : `/services?sort=${encodeURIComponent(sort)}`;
  const selectedCity = getSelectedCity();
  const cityMeta = getCityMeta(selectedCity);
  if (!cityMeta) return null;

  const services = await prisma.listing.findMany({
    where: {
      type: "SERVICE",
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      AND: [
        {
          OR: [
            { city: { equals: cityMeta.label, mode: "insensitive" } },
            { geoCode: { equals: cityMeta.geoCode, mode: "insensitive" } }
          ]
        }
      ]
    },
    orderBy: sort === "views" ? { viewCount: "desc" } : sort === "responses" ? { responseCount: "desc" } : { createdAt: "desc" },
    include: { createdBy: true }
  });

  if (services.length > 0) {
    await prisma.listing.updateMany({ where: { id: { in: services.map((s) => s.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const grouped = new Map<string, typeof services>();
  for (const v of services) {
    const key = serviceTopic(v.title, v.description);
    grouped.set(key, [...(grouped.get(key) || []), v]);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Услуги • {cityMeta.label}</h1>
      <ContentSort basePath="/services" active={sort} options={sortOptions} />
      {searchParams?.reported && (
        <section className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </section>
      )}
      {services.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Для города {cityMeta.label} услуг пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Можно сменить город или вернуться позже, когда появятся новые эксперты.</p>
          <Link className="mt-3 inline-flex rounded-lg bg-hot px-3 py-2 text-sm font-medium text-white" href="/select-city?next=/services">
            Выбрать город
          </Link>
        </section>
      )}
      {Array.from(grouped.entries()).map(([section, items]) => (
        <section key={section} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">{section}</h2>
          {items.map((v) => (
            <ListingDirectoryCard key={v.id} listing={v} kind="SERVICE" topic={section} currentPath={currentPath} isSignedIn={Boolean(session?.user)} />
          ))}
        </section>
      ))}
    </div>
  );
}
