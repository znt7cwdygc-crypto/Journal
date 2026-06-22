import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { deleteProductAction, toggleProductVisibilityAction, updateProductAction } from "@/app/actions";
import { ProductForm } from "@/components/product-form";
import { requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { productSeoPath } from "@/lib/seo-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редактировать товар",
  robots: { index: false, follow: false }
};

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const product = await prisma.product.findFirst({ where: { id: params.id, createdById: user.id } });
  if (!product) notFound();

  const isPublished = product.status === "PUBLISHED";

  return (
    <div className="page-stack">
      <section className="section-card">
        <Link className="text-sm font-semibold text-accent hover:text-teal-900" href="/cabinet#materials">
          Назад в Мое
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Товар</p>
            <h1 className="page-title mt-1">Редактировать товар</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Можно обновить фото, цену, описание, город, доставку и контакт.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link className="btn btn-ghost" href={productSeoPath(product)}>Открыть</Link>
            <form action={toggleProductVisibilityAction}>
              <input type="hidden" name="productId" value={product.id} />
              <button className="btn btn-muted" type="submit">{isPublished ? "Скрыть" : "Опубликовать"}</button>
            </form>
            <form action={deleteProductAction}>
              <input type="hidden" name="productId" value={product.id} />
              <button className="btn btn-danger" type="submit">Удалить</button>
            </form>
          </div>
        </div>
      </section>

      <section className="section-card">
        <ProductForm action={updateProductAction} product={product} submitLabel="Сохранить товар" />
      </section>
    </div>
  );
}
