import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { reportContentAction, respondToProductAction, saveProductAction } from "@/app/actions";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { siteUrl, truncateSeo } from "@/lib/seo";
import { maskContact } from "@/lib/validation";

export const dynamic = "force-dynamic";

const deliveryLabels: Record<string, string> = {
  ANY: "Город или доставка",
  CITY_ONLY: "Только в городе",
  DELIVERY: "Есть доставка"
};

const conditionLabels: Record<string, string> = {
  NEW: "Новое",
  GOOD: "Хорошее",
  USED: "Б/у",
  NEEDS_REPAIR: "Нужен ремонт"
};

async function findProduct(id: string) {
  return prisma.product.findFirst({
    where: {
      id,
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    include: { createdBy: true, savedBy: true }
  });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await findProduct(params.id);
  if (!product) return { title: "Товар не найден", robots: { index: false, follow: false } };
  const title = `${product.title} — товар`;
  const description = truncateSeo(product.description);

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: { title, description, url: `/products/${product.id}` }
  };
}

export default async function ProductDetailsPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { reported?: string };
}) {
  const session = await auth();
  const product = await findProduct(params.id);
  if (!product) notFound();

  await prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } });

  const productPath = `/products/${product.id}`;
  const authorName = product.createdBy.name || product.createdBy.email || "Продавец";

  return (
    <article className="bg-white p-5 shadow-sm sm:p-6">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description,
            offers: {
              "@type": "Offer",
              priceCurrency: "RUB",
              price: product.priceRub,
              availability: "https://schema.org/InStock",
              url: siteUrl(productPath).toString()
            }
          })
        }}
      />

      <Link className="text-sm font-semibold text-accent" href="/products">Назад к товарам</Link>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-mint px-3 py-1 font-semibold text-ink">Товар</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">{product.category}</span>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{product.city || "Город не указан"}</span>
      </div>

      {product.imageUrl && <img className="mt-5 aspect-[4/3] w-full rounded-lg object-cover" src={product.imageUrl} alt={product.title} />}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{product.title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{product.createdAt.toLocaleDateString("ru-RU")} • до {product.expiresAt?.toLocaleDateString("ru-RU") || "срок не указан"}</p>
        </div>
        <p className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-lg font-bold text-white">{formatPrice(product.priceRub)} ₽</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-600">
        <span>{deliveryLabels[String(product.delivery)] || product.delivery}</span>
        <span>{conditionLabels[String(product.condition)] || product.condition}</span>
        <span>{product.viewCount + 1} просмотров</span>
        <span>{product.responseCount} откликов</span>
        <span>{product.savedBy.length} сохранений</span>
      </div>

      <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-zinc-800">{product.description}</p>

      {searchParams?.reported && (
        <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          Жалоба отправлена в модерацию.
        </div>
      )}

      <p className="mt-5 text-sm font-medium">Контакт: {session?.user ? product.contact : maskContact(product.contact)}</p>
      {!session?.user && <p className="mt-1 text-xs text-zinc-500">Войдите, чтобы видеть контакт полностью и написать продавцу.</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <form action={respondToProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <button className="btn btn-primary" type="submit">Написать продавцу</button>
        </form>
        <form action={saveProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <button className="btn btn-muted" type="submit">Сохранить</button>
        </form>
        <form action={reportContentAction}>
          <input type="hidden" name="targetType" value="PRODUCT" />
          <input type="hidden" name="targetId" value={product.id} />
          <input type="hidden" name="reason" value="Жалоба на товар" />
          <input type="hidden" name="next" value={productPath} />
          <button className="btn btn-danger" type="submit">Пожаловаться</button>
        </form>
      </div>

      <Link href={`/profiles/${product.createdById}`} className="mt-6 flex items-center gap-3 rounded-lg bg-zinc-50 p-3 text-sm hover:bg-zinc-100">
        {product.createdBy.image ? (
          <img className="h-10 w-10 rounded object-cover" src={product.createdBy.image} alt={authorName} />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded bg-hot font-black text-white">
            {authorName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span>
          <span className="block font-medium text-zinc-900">{authorName}</span>
          {product.createdBy.profileBio && <span className="block text-xs leading-5 text-zinc-600">{product.createdBy.profileBio}</span>}
        </span>
      </Link>
    </article>
  );
}
