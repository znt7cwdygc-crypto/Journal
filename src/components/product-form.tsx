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
    <form action={action} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white" encType="multipart/form-data">
      {product?.id && <input type="hidden" name="productId" value={product.id} />}

      <div className="border-b border-zinc-100 p-5 sm:p-6">
        <label className="form-label" htmlFor="product-image">Фото товара</label>
        <div className="mt-2">
          <ProductImageInput imageUrl={product?.imageUrl} title={product?.title} required={!product?.imageUrl} />
        </div>
      </div>

      <div className="border-b border-zinc-100 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="form-label">Название</span>
            <input className="form-field mt-2" name="title" defaultValue={product?.title ?? ""} placeholder="Например: Logitech Brio 4K" required />
          </label>
          <label className="block">
            <span className="form-label">Категория</span>
            <select className="form-field mt-2" name="category" defaultValue={product?.category ?? "Оборудование"} required>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="form-label">Цена</span>
            <span className="relative mt-2 block">
              <input className="form-field pr-10" name="priceRub" type="number" min="0" step="1" defaultValue={product?.priceRub ?? ""} placeholder="15000" required />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">₽</span>
            </span>
          </label>
          <label className="block">
            <span className="form-label">Город</span>
            <input className="form-field mt-2" name="city" defaultValue={product?.city ?? ""} placeholder="Москва или удаленно" />
          </label>
          <label className="block">
            <span className="form-label">Доставка</span>
            <select className="form-field mt-2" name="delivery" defaultValue={product?.delivery ?? "ANY"}>
              <option value="ANY">Город или доставка</option>
              <option value="CITY_ONLY">Только самовывоз</option>
              <option value="DELIVERY">Почта/курьер по России</option>
            </select>
          </label>
          <label className="block">
            <span className="form-label">Состояние</span>
            <select className="form-field mt-2" name="condition" defaultValue={product?.condition ?? "GOOD"}>
              <option value="NEW">Новое</option>
              <option value="GOOD">Хорошее</option>
              <option value="USED">Б/у</option>
              <option value="NEEDS_REPAIR">Нужен ремонт</option>
            </select>
          </label>
        </div>
      </div>

      <label className="block border-b border-zinc-100 p-5 sm:p-6">
        <span className="form-label">Описание</span>
        <textarea
          className="form-textarea mt-2"
          name="description"
          rows={5}
          defaultValue={product?.description ?? ""}
          placeholder="Что продаете, почему продаете, комплектация, дефекты, как передать товар."
          required
        />
      </label>

      <label className="block border-b border-zinc-100 p-5 sm:p-6">
        <span className="form-label">Контакт</span>
        <input className="form-field mt-2" name="contact" defaultValue={product?.contact ?? ""} placeholder="@telegram или email" required />
      </label>

      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
        <ProductSubmitButton label={submitLabel} />
        <p className="text-xs leading-5 text-zinc-500">После нажатия дождитесь публикации, обычно это занимает несколько секунд.</p>
      </div>
    </form>
  );
}
