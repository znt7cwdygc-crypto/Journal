import type { ProductCondition, ProductDelivery } from "@prisma/client";

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
    <form action={action} className="space-y-3" encType="multipart/form-data">
      {product?.id && <input type="hidden" name="productId" value={product.id} />}

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <label className="form-label" htmlFor="product-image">Фото товара</label>
        {product?.imageUrl && (
          <img className="mt-2 aspect-[4/3] w-full rounded-lg object-cover" src={product.imageUrl} alt={product.title || "Фото товара"} />
        )}
        <input id="product-image" className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" type="file" name="imageFile" accept="image/*" required={!product?.imageUrl} />
        <p className="form-hint mt-2">До 2 МБ. Первое фото будет обложкой карточки.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="form-label">Название</span>
          <input className="form-field mt-1" name="title" defaultValue={product?.title ?? ""} placeholder="Например: Logitech Brio 4K" required />
        </label>
        <label className="block">
          <span className="form-label">Категория</span>
          <select className="form-field mt-1" name="category" defaultValue={product?.category ?? "Оборудование"} required>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="form-label">Цена, ₽</span>
          <input className="form-field mt-1" name="priceRub" type="number" min="0" step="1" defaultValue={product?.priceRub ?? ""} placeholder="15000" required />
        </label>
        <label className="block">
          <span className="form-label">Город</span>
          <input className="form-field mt-1" name="city" defaultValue={product?.city ?? ""} placeholder="Москва или удаленно" />
        </label>
        <label className="block">
          <span className="form-label">Доставка</span>
          <select className="form-field mt-1" name="delivery" defaultValue={product?.delivery ?? "ANY"}>
            <option value="ANY">Город или доставка</option>
            <option value="CITY_ONLY">Только в городе</option>
            <option value="DELIVERY">Есть доставка</option>
          </select>
        </label>
        <label className="block">
          <span className="form-label">Состояние</span>
          <select className="form-field mt-1" name="condition" defaultValue={product?.condition ?? "GOOD"}>
            <option value="NEW">Новое</option>
            <option value="GOOD">Хорошее</option>
            <option value="USED">Б/у</option>
            <option value="NEEDS_REPAIR">Нужен ремонт</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="form-label">Описание</span>
        <textarea
          className="form-textarea mt-1"
          name="description"
          rows={5}
          defaultValue={product?.description ?? ""}
          placeholder="Что продаете, почему продаете, комплектация, дефекты, как передать товар."
          required
        />
      </label>

      <label className="block">
        <span className="form-label">Контакт</span>
        <input className="form-field mt-1" name="contact" defaultValue={product?.contact ?? ""} placeholder="@telegram или email" required />
      </label>

      <button className="btn btn-primary w-full sm:w-auto" type="submit">{submitLabel}</button>
    </form>
  );
}
