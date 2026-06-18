import type { Metadata } from "next";
import { auth } from "@/auth";
import { ContentSort } from "@/components/content-sort";
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
  { key: "views", label: "Популярные" },
  { key: "responses", label: "По откликам" }
];

export default async function ProductsPage({ searchParams }: { searchParams?: { sort?: string; reported?: string } }) {
  const session = await auth();
  const sort = searchParams?.sort || "new";
  const currentPath = `/products${sort !== "new" ? `?sort=${encodeURIComponent(sort)}` : ""}`;

  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    orderBy: sort === "views" ? { viewCount: "desc" } : sort === "responses" ? { responseCount: "desc" } : { createdAt: "desc" },
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
      createdBy: { select: { id: true, name: true, email: true, image: true, profileBio: true } }
    }
  });

  if (products.length > 0) {
    await prisma.product.updateMany({ where: { id: { in: products.map((product) => product.id) } }, data: { viewCount: { increment: 1 } } });
  }

  const grouped = new Map<string, typeof products>();
  for (const product of products) {
    grouped.set(product.category, [...(grouped.get(product.category) || []), product]);
  }

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

      <ContentSort basePath="/products" active={sort} options={sortOptions} />

      {searchParams?.reported && (
        <section className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </section>
      )}

      {products.length === 0 && (
        <section className="border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Товаров пока нет</h2>
          <p className="mt-2 text-sm text-zinc-600">Можно первым выставить камеру, свет, мебель или другой полезный товар.</p>
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
