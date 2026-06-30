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
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-ink">Товар</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{product.category}</span>
        <span className="text-zinc-500">{product.createdAt.toLocaleDateString("ru-RU")}</span>
      </div>

      {/* Title row: text left, image right */}
      <Link href={productPath} className="mt-3 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold leading-tight text-ink">{product.title}</h3>
          {product.priceRub > 0 && (
            <p className="mt-3 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-base font-bold text-white">
              {formatPrice(product.priceRub)} ₽
            </p>
          )}
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-700">{product.description}</p>
        </div>
        {imageSrc && (
          <img
            className="h-24 w-24 shrink-0 rounded-lg object-cover sm:h-28 sm:w-28"
            src={imageSrc}
            alt={product.title}
          />
        )}
      </Link>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        {product.city && <span>{product.city}</span>}
        <span>{conditionLabels[product.condition] || product.condition}</span>
        <span>{deliveryLabels[product.delivery] || product.delivery}</span>
        <span>Просмотры: {product.viewCount + 1}</span>
      </div>

      {/* Actions */}
      <div className="directory-actions mt-4 grid grid-cols-3 gap-2">
        <ContactReveal contact={product.contact} signedIn={isSignedIn} compact />
        <form action={saveProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="next" value={currentPath} />
          <button className="btn btn-muted h-10 w-full whitespace-nowrap px-1 text-[11px]" type="submit">
            {isSaved ? "Убрать" : "В избранное"}
          </button>
        </form>
        <ReportButton
          targetType="PRODUCT"
          targetId={product.id}
          next={currentPath}
          buttonClassName="btn btn-danger h-10 w-full whitespace-nowrap px-1 text-[11px]"
        />
      </div>

      {/* Author footer */}
      <Link href={`/profiles/${product.createdBy.id}`} className="mt-4 flex min-w-0 items-center gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-600 hover:text-hot">
        {product.createdBy.image ? (
          <img className="h-8 w-8 shrink-0 rounded object-cover" src={product.createdBy.image} alt={authorName(product.createdBy)} />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-hot font-black text-white">
            {authorName(product.createdBy).slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-medium text-zinc-800">{authorName(product.createdBy)}</span>
          {product.createdBy.profileBio && <span className="block truncate text-zinc-500">{product.createdBy.profileBio}</span>}
        </span>
      </Link>
    </article>
  );
}
