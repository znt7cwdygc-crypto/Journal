import type { ProductCondition, ProductDelivery } from "@prisma/client";
import { ProductImageInput } from "@/components/product-image-input";
import { ProductSubmitButton } from "@/components/product-submit-button";

type ProductFormValues = {
  id?: string;
  title?: string;
  category?: string;
  priceRub?: number;
  city?: string | null;
  delivery?: ProductDelivery | string;
  condition?: ProductCondition | string;
  description?: string;
  contact?: string;
  imageUrl?: string | null;
};

const categories = ["Оборудование", "Свет", "Камеры", "Компьютеры", "Мебель", "Декор", "Одежда", "Другое"];

export function ProductForm({
  action,
  product,
  submitLabel = "Опубликовать товар"
}: {
  action: (formData: FormData) => void | Promise<void>;
  product?: ProductFormValues | null;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="overflow-hidden rounded-xl border border-zinc-200 bg-white" encType="multipart/form-data">
      {product?.id && <input type="hidden" name="productId" value={product.id} />}

      <div className="border-b border-zinc-100 p-3 sm:p-4">
        <label className="form-label" htmlFor="product-image">Фото товара</label>
        <div className="mt-1">
          <ProductImageInput imageUrl={product?.imageUrl} title={product?.title} required={!product?.imageUrl} />
        </div>
      </div>

      <div className="border-b border-zinc-100 p-3 sm:p-4">
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          <label className="block">
            <span className="form-label">Название</span>
            <input className="form-field mt-1 h-10" name="title" defaultValue={product?.title ?? ""} placeholder="Например: Logitech Brio 4K" required />
          </label>
          <label className="block">
            <span className="form-label">Категория</span>
            <select className="form-field mt-1 h-10" name="category" defaultValue={product?.category ?? "Оборудование"} required>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="form-label">Цена</span>
            <span className="relative mt-1 block">
              <input className="form-field h-10 pr-10" name="priceRub" type="text" inputMode="numeric" defaultValue={product?.priceRub ?? ""} placeholder="15000" required />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">₽</span>
            </span>
          </label>
          <label className="block">
            <span className="form-label">Город</span>
            <input className="form-field mt-1 h-10" name="city" defaultValue={product?.city ?? ""} placeholder="Москва или удаленно" />
          </label>
          <label className="block">
            <span className="form-label">Доставка</span>
            <select className="form-field mt-1 h-10" name="delivery" defaultValue={product?.delivery ?? "ANY"}>
              <option value="ANY">Город или доставка</option>
              <option value="CITY_ONLY">Только самовывоз</option>
              <option value="DELIVERY">Почта/курьер по России</option>
            </select>
          </label>
          <label className="block">
            <span className="form-label">Состояние</span>
            <select className="form-field mt-1 h-10" name="condition" defaultValue={product?.condition ?? "GOOD"}>
              <option value="NEW">Новое</option>
              <option value="GOOD">Хорошее</option>
              <option value="USED">Б/у</option>
              <option value="NEEDS_REPAIR">Нужен ремонт</option>
            </select>
          </label>
        </div>
      </div>

      <label className="block border-b border-zinc-100 p-3 sm:p-4">
        <span className="form-label">Описание</span>
        <textarea
          className="form-textarea mt-1 min-h-[88px]"
          name="description"
          rows={3}
          defaultValue={product?.description ?? ""}
          placeholder="Что продаете, почему продаете, комплектация, дефекты, как передать товар."
          required
        />
      </label>

      <label className="block border-b border-zinc-100 p-3 sm:p-4">
        <span className="form-label">Контакт</span>
        <input className="form-field mt-1 h-10" name="contact" defaultValue={product?.contact ?? ""} placeholder="@telegram или email" required />
      </label>

      <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
        <p className="text-xs leading-5 text-zinc-500">После нажатия дождитесь публикации, обычно это занимает несколько секунд.</p>
        <div className="sm:justify-self-end">
          <ProductSubmitButton label={submitLabel} />
        </div>
      </div>
    </form>
  );
}
