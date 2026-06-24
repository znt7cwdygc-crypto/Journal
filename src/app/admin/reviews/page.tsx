import type { Metadata } from "next";
import { deleteListingReviewAction } from "@/app/actions";
import { requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle, Table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Админ-панель — Отзывы",
  robots: { index: false, follow: false },
};

export default async function ReviewsPage() {
  await requireRole(["ADMIN", "MODERATOR"]);

  const listingReviews = await prisma.listingReview.findMany({
    where: { listing: { type: "SERVICE" } },
    include: { listing: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Отзывы</h1>
        <p className="text-sm text-zinc-500">Отзывы на услуги</p>
      </div>

      <Card className="p-0">
        <div className="px-5 pt-5"><CardTitle>Отзывы ({listingReviews.length})</CardTitle></div>
        {listingReviews.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-zinc-500">Отзывов пока нет.</p>
        ) : (
          <Table head={
            <tr>
              <th className="px-4 py-2">Оценка</th>
              <th className="px-4 py-2">Услуга</th>
              <th className="px-4 py-2">Автор</th>
              <th className="px-4 py-2">Текст</th>
              <th className="px-4 py-2">Дата</th>
              <th className="px-4 py-2">Действия</th>
            </tr>
          }>
            {listingReviews.map((review) => (
              <tr key={review.id} className="even:bg-zinc-50">
                <td className="px-4 py-2 font-medium text-zinc-900">
                  {review.parentId ? "Ответ" : `${review.rating || "-"}/5`}
                </td>
                <td className="px-4 py-2 text-zinc-700">{review.listing.title}</td>
                <td className="px-4 py-2 text-zinc-500">{review.user.email || review.user.name}</td>
                <td className="max-w-xs truncate px-4 py-2 text-zinc-600">{review.body}</td>
                <td className="px-4 py-2 text-zinc-400">{review.createdAt.toLocaleDateString("ru-RU")}</td>
                <td className="px-4 py-2">
                  <form action={deleteListingReviewAction}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white" type="submit">Удалить</button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
