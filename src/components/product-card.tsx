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

  const imageSrc = product.imageUrl || null;

  return (
    <article className="directory-card bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">

      {/* Image + title block */}
      <Link href={productPath} className="flex gap-4">
        {imageSrc ? (
          <img className="h-24 w-24 shrink-0 rounded-lg object-cover" src={imageSrc} alt={product.title} />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-3xl text-zinc-300">
            📦
          </div>
        )}
        <div className="min-w-0 flex-1">
          {/* Title + price on same line */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-snug text-ink">{product.title}</h3>
            <span className="shrink-0 rounded-md bg-zinc-900 px-2.5 py-1 text-sm font-bold text-white">
              {formatPrice(product.priceRub)} ₽
            </span>
          </div>
          {/* Meta */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            {product.city && <span>{product.city}</span>}
            <span>{conditionLabels[product.condition] || product.condition}</span>
            <span>{deliveryLabels[product.delivery] || product.delivery}</span>
            <span className="text-zinc-400">👁 {product.viewCount + 1}</span>
          </div>
        </div>
      </Link>

      {/* Description */}
      {product.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-5 text-zinc-600">{product.description}</p>
      )}

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-ink">Товар</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">{product.category}</span>
      </div>

      {/* Actions: 2 equal buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ContactReveal contact={product.contact} signedIn={isSignedIn} compact />
        <form action={saveProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="next" value={currentPath} />
          <button className="h-10 w-full rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" type="submit">
            {isSaved ? "Убрать" : "В избранное"}
          </button>
        </form>
      </div>

      {/* Footer: author + date + report */}
      <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
        <Link href={`/profiles/${product.createdBy.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:text-hot">
          {product.createdBy.image ? (
            <img className="h-7 w-7 shrink-0 rounded-full object-cover" src={product.createdBy.image} alt={authorName(product.createdBy)} />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-hot text-[10px] font-black text-white">
              {authorName(product.createdBy).slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate text-xs font-medium text-zinc-700">{authorName(product.createdBy)}</span>
        </Link>
        <span className="shrink-0 text-[11px] text-zinc-400">{product.createdAt.toLocaleDateString("ru-RU")}</span>
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
