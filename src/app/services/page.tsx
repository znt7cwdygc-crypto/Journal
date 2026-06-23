import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { AdBlock } from "@/components/ad-block";
import { CatalogFilterForm } from "@/components/catalog-filter-form";
import { CatalogPageHeader } from "@/components/catalog-page-header";
import { ListingDirectoryCard } from "@/components/directory-card";
import { serviceTopic } from "@/lib/topics";
import { siteUrl } from "@/lib/seo";
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

function structuredValue(text: string, label: string) {
  const line = text.split("\n").find((item) => item.trim().toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(line.indexOf(":") + 1).trim() : "";
}

function serviceCategory(title: string, description: string) {
  return structuredValue(description, "Категория") || serviceTopic(title, description);
}

function cleanFilter(value?: string) {
  return String(value ?? "").trim().slice(0, 120);
}

function isRemoteService(service: { city: string | null; geoCode: string | null; employmentType: string | null }) {
  const city = (service.city || "").toLowerCase();
  return service.employmentType === "REMOTE" || service.geoCode?.toLowerCase() === "remote" || city === "remote" || city.includes("удален");
}

export default async function ServicesPage({ searchParams }: { searchParams?: { city?: string; category?: string; reported?: string; favorite?: string } }) {
  const session = await auth();
  const cityValue = cleanFilter(searchParams?.city);
  const categoryValue = cleanFilter(searchParams?.category);
  const currentParams = new URLSearchParams();
  if (cityValue) currentParams.set("city", cityValue);
  if (categoryValue) currentParams.set("category", categoryValue);
  const currentQuery = currentParams.toString();
  const currentPath = `/services${currentQuery ? `?${currentQuery}` : ""}`;

  const allServices = await prisma.listing.findMany({
    where: {
      type: "SERVICE",
      status: "PUBLISHED",
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: true,
      reviews: { where: { parentId: null, isHidden: false }, select: { rating: true } },
      savedBy: session?.user?.id ? { where: { userId: session.user.id }, select: { userId: true } } : { where: { userId: "__guest__" }, select: { userId: true } }
    }
  });

  const categories = Array.from(new Set(allServices.map((service) => serviceCategory(service.title, service.description)))).sort((a, b) => a.localeCompare(b, "ru"));
  const hasRemote = allServices.some(isRemoteService);
  const cities = Array.from(
    new Set(
      allServices
        .filter((service) => !isRemoteService(service))
        .map((service) => service.city?.trim())
        .filter((city): city is string => Boolean(city))
    )
  ).sort((a, b) => a.localeCompare(b, "ru"));

  const services = allServices.filter((service) => {
    const categoryMatches = !categoryValue || serviceCategory(service.title, service.description) === categoryValue;
    const remote = isRemoteService(service);
    const cityMatches = !cityValue || (cityValue === "remote" ? remote : remote || service.city?.trim() === cityValue);
    return categoryMatches && cityMatches;
  });

  if (services.length > 0) {
    await prisma.listing.updateMany({ where: { id: { in: services.map((s) => s.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const grouped = new Map<string, typeof services>();
  for (const service of services) {
    const key = serviceCategory(service.title, service.description);
    grouped.set(key, [...(grouped.get(key) || []), service]);
  }
  const favoriteMessage =
    searchParams?.favorite === "added"
      ? "Услуга добавлена в избранное."
      : searchParams?.favorite === "removed"
        ? "Услуга убрана из избранного."
        : null;

  return (
    <div className="space-y-4">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Услуги",
        "description": "Каталог услуг, экспертов и консультаций WebcamExpert для моделей, студий и команд.",
        "url": siteUrl("/services").toString(),
        "isPartOf": { "@type": "WebSite", "name": "WebcamExpert Journal", "url": siteUrl("/").toString() }
      }) }} />
      <CatalogPageHeader
        eyebrow="Услуги"
        title="Услуги"
        description="Эксперты, сервисы и консультации для моделей, студий и команд."
        actionLabel="Предложить услугу"
        actionHref="/cabinet#service"
      />
      <CatalogFilterForm
        basePath="/services"
        filters={[
          {
            name: "city",
            label: "Город",
            value: cityValue,
            options: [
              { value: "", label: "Все" },
              ...(hasRemote ? [{ value: "remote", label: "Удаленно" }] : []),
              ...cities.map((city) => ({ value: city, label: city }))
            ]
          },
          {
            name: "category",
            label: "Категория",
            value: categoryValue,
            options: [{ value: "", label: "Все" }, ...categories.map((category) => ({ value: category, label: category }))]
          }
        ]}
      />
      <AdBlock placement="services" />
      {searchParams?.reported && (
        <section className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </section>
      )}
      {favoriteMessage && (
        <section className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {favoriteMessage}
        </section>
      )}
      {services.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Под выбранные фильтры услуг пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Попробуйте другой город или категорию, когда появятся новые предложения.</p>
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
