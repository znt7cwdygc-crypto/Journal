import Link from "next/link";
import { saveProductAction } from "@/app/actions";
import { ContactReveal } from "@/components/contact-reveal";
import { ReportButton } from "@/components/report-button";
import { productSeoPath } from "@/lib/seo-url";

type ProductUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  profileBio: string | null;
};

type ProductCardItem = {
  id: string;
  title: string;
  category: string;
  priceRub: number;
  city: string | null;
  delivery: string;
  condition: string;
  description: string;
  contact: string;
  imageUrl: string | null;
  images?: string[];
  viewCount: number;
  responseCount: number;
  createdAt: Date;
  createdBy: ProductUser;
  savedBy?: { userId: string }[];
};

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

function authorName(author: ProductUser) {
  return author.name || author.email || "Продавец";
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function ProductDirectoryCard({
  product,
  currentPath,
  isSignedIn
}: {
  product: ProductCardItem;
  currentPath: string;
  isSignedIn: boolean;
}) {
  const isSaved = Boolean(product.savedBy?.length);
  const productPath = productSeoPath(product);

  const imageSrc = product.images?.[0] || product.imageUrl || null;

  return (
    <article className="directory-card bg-white p-3 shadow-sm transition hover:shadow-md">
      {/* Top badges */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full bg-mint px-2 py-0.5 font-semibold text-ink">Товар</span>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-600">{product.category}</span>
        <span className="ml-auto text-zinc-400">{product.createdAt.toLocaleDateString("ru-RU")}</span>
      </div>

      {/* Main row: image + content */}
      <Link href={productPath} className="mt-2 flex gap-3">
        {imageSrc ? (
          <img className="h-20 w-20 shrink-0 rounded-lg object-cover" src={imageSrc} alt={product.title} />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl text-zinc-300">
            📦
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{product.title}</h3>
          <p className="mt-1 inline-flex rounded bg-zinc-900 px-2 py-0.5 text-sm font-bold text-white">{formatPrice(product.priceRub)} ₽</p>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
            {product.city && <span>{product.city}</span>}
            <span>{conditionLabels[product.condition] || product.condition}</span>
            <span className="text-zinc-400">👁 {product.viewCount + 1}</span>
          </div>
        </div>
      </Link>

      {/* Description */}
      {product.description && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{product.description}</p>
      )}

      {/* Actions */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ContactReveal contact={product.contact} signedIn={isSignedIn} compact />
        <form action={saveProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="next" value={currentPath} />
          <button className="h-9 w-full rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50" type="submit">
            {isSaved ? "Убрать" : "В избранное"}
          </button>
        </form>
      </div>

      {/* Author + report */}
      <div className="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2">
        <Link href={`/profiles/${product.createdBy.id}`} className="flex min-w-0 flex-1 items-center gap-1.5 hover:text-hot">
          {product.createdBy.image ? (
            <img className="h-6 w-6 shrink-0 rounded-full object-cover" src={product.createdBy.image} alt={authorName(product.createdBy)} />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-hot text-[9px] font-black text-white">
              {authorName(product.createdBy).slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate text-xs font-medium text-zinc-600">{authorName(product.createdBy)}</span>
        </Link>
        <ReportButton
          targetType="PRODUCT"
          targetId={product.id}
          next={currentPath}
          buttonClassName="shrink-0 text-[11px] text-zinc-400 hover:text-red-500"
        />
      </div>
    </article>
  );
}
