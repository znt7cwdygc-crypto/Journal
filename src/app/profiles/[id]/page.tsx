import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { followAuthorAction, reportContentAction } from "@/app/actions";
import { auth } from "@/auth";
import { SafeImage } from "@/components/safe-image";
import { safeImageUrl } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { siteUrl, truncateSeo } from "@/lib/seo";

export const dynamic = "force-dynamic";

const modeLabels = {
  CONSUMER: "Ищу услуги / работу",
  PROVIDER: "Предлагаю услуги / вакансии",
  BOTH: "Ищу и предлагаю"
} as const;

const profileLabels = {
  MODEL: "Модель",
  OPERATOR: "Оператор",
  STUDIO: "Студия",
  AGENCY: "Агентство",
  EXPERT: "Эксперт",
  COACH: "Коуч",
  LAWYER: "Юрист",
  OTHER: "Другое"
} as const;

async function findProfile(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      articles: {
        where: { status: "PUBLISHED" },
        include: { ratings: true, comments: true },
        orderBy: { createdAt: "desc" },
        take: 10
      },
      listings: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 10
      },
      products: {
        where: { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: { createdAt: "desc" },
        take: 10
      },
      resume: true,
      authorFollowers: true,
      articleComments: {
        include: { article: true },
        orderBy: { createdAt: "desc" },
        take: 10
      }
    }
  });
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const user = await findProfile(params.id);
  if (!user) return { title: "Профиль не найден", robots: { index: false, follow: false } };

  const name = user.name || user.email || "Автор WebcamExpert";
  const profileType = profileLabels[user.profileKind];
  const description = truncateSeo(
    user.profileBio ||
      user.resume?.bio ||
      `${profileType} на WebcamExpert: опубликованные статьи, вакансии, услуги или публичное резюме участника сообщества.`
  );

  return {
    title: `${name} — профиль автора`,
    description,
    alternates: { canonical: `/profiles/${user.id}` },
    openGraph: {
      title: `${name} — WebcamExpert`,
      description,
      url: `/profiles/${user.id}`,
      type: "profile"
    }
  };
}

export default async function ProfilePage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { follow?: string; reported?: string };
}) {
  const session = await auth();
  const user = await findProfile(params.id);

  if (!user) notFound();
  const useful = user.articles.reduce((sum, article) => sum + article.ratings.filter((rating) => rating.value >= 4).length, 0);
  const comments = user.articles.reduce((sum, article) => sum + article.comments.length, 0);
  const usefulnessRating = user.articles.length ? Math.round((useful / user.articles.length) * 10) / 10 : 0;
  const city = user.resume?.city || user.listings.find((listing) => listing.city)?.city || "Город не указан";
  const verified = user.role === "ADMIN" || useful >= 5 || user.authorFollowers.length >= 3;
  const activeAuthor = user.articles.length >= 3;
  const isOwnProfile = session?.user?.id === user.id;
  const isFollowing = session?.user && !isOwnProfile
    ? await prisma.follow.findUnique({ where: { followerId_authorId: { followerId: session.user.id, authorId: user.id } } })
    : null;
  const profilePath = `/profiles/${user.id}`;
  const profileImage = safeImageUrl(user.image);

  return (
    <div className="space-y-4">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            mainEntity: {
              "@type": "Person",
              name: user.name || user.email || "Автор WebcamExpert",
              description: truncateSeo(user.profileBio || user.resume?.bio || ""),
              image: user.image || undefined,
              url: siteUrl(`/profiles/${user.id}`).toString()
            }
          })
        }}
      />
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {profileImage ? (
            <SafeImage
              className="h-24 w-24 rounded-lg object-cover"
              src={profileImage}
              alt={user.name || "Аватар профиля"}
              fallback={
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-hot text-3xl font-black text-white">
                  {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
                </div>
              }
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-hot text-3xl font-black text-white">
              {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">{user.name || "Пользователь"}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {user.role === "ADMIN" ? "Администратор" : "Пользователь"} • {modeLabels[user.accountMode]} • {profileLabels[user.profileKind]} • {city}
            </p>
            {user.profileBio && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-zinc-700">{user.profileBio}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-red-50 px-3 py-1 font-medium text-hot">{user.articles.length} статей</span>
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">{comments} комментариев</span>
              <span className="rounded-full bg-yellow-50 px-3 py-1 font-medium text-amber-800">{useful} полезных реакций</span>
              <span className="rounded-full bg-yellow-50 px-3 py-1 font-medium text-amber-800">рейтинг полезности {usefulnessRating}</span>
              <span className="rounded-full bg-teal-50 px-3 py-1 font-medium text-accent">{user.listings.length} размещений</span>
              <span className="rounded-full bg-mint px-3 py-1 font-medium text-ink">{user.products.length} товаров</span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">{user.authorFollowers.length} подписчиков</span>
              {verified && <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">проверенный профиль</span>}
              {activeAuthor && <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">активный автор</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {!isOwnProfile && (
                <>
                  <form action={followAuthorAction}>
                    <input type="hidden" name="authorId" value={user.id} />
                    <input type="hidden" name="next" value={profilePath} />
                    <button className="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white" type="submit">
                      {isFollowing ? "Отписаться" : "Подписаться"}
                    </button>
                  </form>
                  <form action={reportContentAction}>
                    <input type="hidden" name="targetType" value="PROFILE" />
                    <input type="hidden" name="targetId" value={user.id} />
                    <input type="hidden" name="reason" value="Жалоба на профиль" />
                    <input type="hidden" name="next" value={profilePath} />
                    <button className="rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-700" type="submit">Пожаловаться</button>
                  </form>
                </>
              )}
            </div>
            {(searchParams?.reported || searchParams?.follow) && (
              <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
                {searchParams?.reported
                  ? "Жалоба отправлена в модерацию."
                  : searchParams?.follow === "added"
                    ? "Вы подписались на автора."
                    : searchParams?.follow === "removed"
                      ? "Вы отписались от автора."
                      : "Действие выполнено."}
              </div>
            )}
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 border border-zinc-200 bg-white p-3 text-sm shadow-sm">
        <a className="rounded-lg bg-ink px-3 py-2 font-semibold text-white" href="#articles">Статьи</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#discussions">Обсуждения</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#vacancies">Вакансии</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#services">Услуги</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#products">Товары</a>
        <a className="rounded-lg bg-zinc-100 px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-200" href="#resume">Резюме</a>
      </nav>

      {user.resume && (
        <section id="resume" className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-medium">Резюме</h2>
          <p className="mt-2">{user.resume.title}</p>
          <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{user.resume.bio}</p>
        </section>
      )}

      <section id="articles" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Статьи автора</h2>
        <div className="mt-3 space-y-2 text-sm">
          {user.articles.length === 0 && <p className="text-zinc-500">Пока нет опубликованных статей.</p>}
          {user.articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.id}`} className="block rounded border p-3 hover:bg-zinc-50">
              <span className="font-medium">{article.title}</span>
              <span className="mt-1 block text-xs text-zinc-500">{article.comments.length} комментариев • {article.ratings.filter((rating) => rating.value >= 4).length} полезных реакций</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="discussions" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Обсуждения автора</h2>
        <div className="mt-3 space-y-2 text-sm">
          {user.articleComments.length === 0 && <p className="text-zinc-500">Пока нет комментариев.</p>}
          {user.articleComments.map((comment) => (
            <Link key={comment.id} href={`/articles/${comment.article.id}#comments`} className="block rounded border p-3 hover:bg-zinc-50">
              <span className="font-medium">{comment.article.title}</span>
              <span className="mt-1 block text-xs text-zinc-500">{comment.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="vacancies" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Вакансии автора</h2>
        <div className="mt-3 space-y-2 text-sm">
          {user.listings.filter((listing) => listing.type === "VACANCY").length === 0 && <p className="text-zinc-500">Пока нет вакансий.</p>}
          {user.listings.filter((listing) => listing.type === "VACANCY").map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`} className="block rounded border p-2 hover:bg-zinc-50">
              <p className="font-medium">{listing.title}</p>
              <p className="text-xs text-zinc-500">{listing.city || "Удаленно"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="services" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Услуги автора</h2>
        <div className="mt-3 space-y-2 text-sm">
          {user.listings.filter((listing) => listing.type === "SERVICE").length === 0 && <p className="text-zinc-500">Пока нет услуг.</p>}
          {user.listings.filter((listing) => listing.type === "SERVICE").map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`} className="block rounded border p-2 hover:bg-zinc-50">
              <p className="font-medium">{listing.title}</p>
              <p className="text-xs text-zinc-500">{listing.city || "Удаленно"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="products" className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-medium">Товары автора</h2>
        <div className="mt-3 space-y-2 text-sm">
          {user.products.length === 0 && <p className="text-zinc-500">Пока нет товаров.</p>}
          {user.products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="flex items-center gap-3 rounded border p-2 hover:bg-zinc-50">
              {product.imageUrl && <img className="h-12 w-12 shrink-0 rounded object-cover" src={product.imageUrl} alt={product.title} />}
              <span className="min-w-0">
                <span className="block truncate font-medium">{product.title}</span>
                <span className="text-xs text-zinc-500">{product.category} • {new Intl.NumberFormat("ru-RU").format(product.priceRub)} ₽</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
