import type { Metadata } from "next";
import { auth } from "@/auth";
import { CatalogFilterForm } from "@/components/catalog-filter-form";
import { ProductDirectoryCard } from "@/components/product-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Товары",
  description: "Товары участников WebcamExpert: оборудование, свет, камеры, мебель и полезные вещи для работы.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Товары WebcamExpert",
    description: "Маркетплейс товаров внутри сообщества WebcamExpert.",
    url: "/products"
  }
};

const sortOptions = [
  { key: "new", label: "Новые" },
  { key: "views", label: "Популярные" }
];

function cleanFilter(value?: string) {
  return String(value ?? "").trim().slice(0, 120);
}

function normalizeSort(value?: string) {
  return sortOptions.some((option) => option.key === value) ? String(value) : "new";
}

export default async function ProductsPage({ searchParams }: { searchParams?: { sort?: string; city?: string; category?: string; reported?: string; favorite?: string } }) {
  const session = await auth();
  const sort = normalizeSort(searchParams?.sort);
  const cityValue = cleanFilter(searchParams?.city);
  const categoryValue = cleanFilter(searchParams?.category);
  const currentParams = new URLSearchParams();
  if (cityValue) currentParams.set("city", cityValue);
  if (categoryValue) currentParams.set("category", categoryValue);
  if (sort !== "new") currentParams.set("sort", sort);
  const currentQuery = currentParams.toString();
  const currentPath = `/products${currentQuery ? `?${currentQuery}` : ""}`;

  const allProducts = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    orderBy: sort === "views" ? { viewCount: "desc" } : { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      priceRub: true,
      city: true,
      delivery: true,
      condition: true,
      description: true,
      contact: true,
      viewCount: true,
      responseCount: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true, image: true, profileBio: true } },
      savedBy: session?.user?.id ? { where: { userId: session.user.id }, select: { userId: true } } : { where: { userId: "__guest__" }, select: { userId: true } }
    }
  });

  const cities = Array.from(new Set(allProducts.map((product) => product.city?.trim()).filter((city): city is string => Boolean(city)))).sort((a, b) => a.localeCompare(b, "ru"));
  const categories = Array.from(new Set(allProducts.map((product) => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  const products = allProducts.filter((product) => {
    const cityMatches = !cityValue || product.city?.trim() === cityValue;
    const categoryMatches = !categoryValue || product.category === categoryValue;
    return cityMatches && categoryMatches;
  });

  if (products.length > 0) {
    await prisma.product.updateMany({ where: { id: { in: products.map((product) => product.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const grouped = new Map<string, typeof products>();
  for (const product of products) {
    grouped.set(product.category, [...(grouped.get(product.category) || []), product]);
  }
  const favoriteMessage =
    searchParams?.favorite === "added"
      ? "Товар добавлен в избранное."
      : searchParams?.favorite === "removed"
        ? "Товар убран из избранного."
        : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Маркет</p>
          <h1 className="page-title mt-1">Товары</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Оборудование, свет, камеры, мебель и полезные вещи от участников сообщества.</p>
        </div>
        <a className="btn btn-primary" href="/cabinet#products">Продать товар</a>
      </div>

      <CatalogFilterForm
        basePath="/products"
        filters={[
          {
            name: "city",
            label: "Город",
            value: cityValue,
            options: [{ value: "", label: "Все" }, ...cities.map((city) => ({ value: city, label: city }))]
          },
          {
            name: "category",
            label: "Категория",
            value: categoryValue,
            options: [{ value: "", label: "Все" }, ...categories.map((category) => ({ value: category, label: category }))]
          },
          {
            name: "sort",
            label: "Сортировка",
            value: sort,
            defaultValue: "new",
            options: sortOptions.map((option) => ({ value: option.key, label: option.label }))
          }
        ]}
      />

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

      {products.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Под выбранные фильтры товаров пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Попробуйте другой город или категорию, когда появятся новые товары.</p>
        </section>
      )}

      {Array.from(grouped.entries()).map(([category, items]) => (
        <section key={category} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">{category}</h2>
          {items.map((product) => (
            <ProductDirectoryCard key={product.id} product={{ ...product, imageUrl: null }} currentPath={currentPath} isSignedIn={Boolean(session?.user)} />
          ))}
        </section>
      ))}
    </div>
  );
}
