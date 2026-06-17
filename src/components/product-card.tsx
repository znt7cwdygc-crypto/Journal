import Link from "next/link";
import { reportContentAction, respondToProductAction, saveProductAction } from "@/app/actions";
import { maskContact } from "@/lib/validation";

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
  return (
    <article className="directory-card bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-mint px-2.5 py-1 font-semibold text-ink">Товар</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700">{product.category}</span>
        <span className="text-zinc-500">{product.createdAt.toLocaleDateString("ru-RU")}</span>
      </div>

      <Link href={`/products/${product.id}`} className="mt-3 block">
        {product.imageUrl && <img className="aspect-[4/3] w-full rounded-lg object-cover" src={product.imageUrl} alt={product.title} />}
        <div className="mt-3 flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-xl font-semibold leading-tight text-ink">{product.title}</h3>
          <p className="shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-sm font-bold text-white">{formatPrice(product.priceRub)} ₽</p>
        </div>
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{product.description}</p>
      </Link>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        <span>{product.city || "Город не указан"}</span>
        <span>{deliveryLabels[product.delivery] || product.delivery}</span>
        <span>{conditionLabels[product.condition] || product.condition}</span>
        <span>Просмотры: {product.viewCount + 1}</span>
        <span>Отклики: {product.responseCount}</span>
      </div>

      <div className="mt-3 text-sm text-zinc-700">
        <span className="font-medium text-zinc-900">Контакт: </span>
        {isSignedIn ? product.contact : maskContact(product.contact)}
        {!isSignedIn && <p className="mt-1 text-xs text-zinc-500">Войдите, чтобы видеть контакт полностью и написать продавцу.</p>}
      </div>

      <div className="directory-actions mt-4 flex flex-wrap gap-2">
        <form action={respondToProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <button className="btn btn-primary w-full" type="submit">Написать</button>
        </form>
        <form action={saveProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <button className="btn btn-muted w-full" type="submit">Сохранить</button>
        </form>
        <form action={reportContentAction}>
          <input type="hidden" name="targetType" value="PRODUCT" />
          <input type="hidden" name="targetId" value={product.id} />
          <input type="hidden" name="reason" value="Жалоба на товар" />
          <input type="hidden" name="next" value={currentPath} />
          <button className="btn btn-danger w-full" type="submit">Жалоба</button>
        </form>
      </div>

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
