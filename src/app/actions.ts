"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AccountMode, ContentStatus, ListingType, PaymentStatus, PaymentType, Prisma, ProductCondition, ProductDelivery, ProfileKind } from "@prisma/client";
import { auth, signIn, signOut } from "@/auth";
import { getExpertLicenseEnd, getResumeUnlockEnd } from "@/lib/licenses";
import { prisma } from "@/lib/prisma";
import { listingExpiresAt, productExpiresAt, resumeExpiresAt } from "@/lib/publication-periods";
import { safeInternalPath } from "@/lib/safe-redirect";
import { articleTopic } from "@/lib/topics";
import { isUploadedFile, saveUploadedImage } from "@/lib/uploaded-image";
import { cleanMultiline, cleanNumber, cleanText, makeSlug, optionalUrl, requireMultiline, requireText } from "@/lib/validation";

function ensureAdult(formData: FormData) {
  if (formData.get("adult") !== "on") throw new Error("Нужно подтвердить 18+");
}

export async function registerAction(formData: FormData) {
  const email = cleanText(formData.get("email"), 255).toLowerCase();
  const name = cleanText(formData.get("name"), 120);
  const password = String(formData.get("password") ?? "");
  const accountMode = normalizeAccountMode(String(formData.get("accountMode") ?? "CONSUMER"));
  const profileKind = normalizeProfileKind(String(formData.get("profileKind") ?? "MODEL"));

  ensureAdult(formData);
  if (!email || !password || password.length < 6) throw new Error("Некорректные данные регистрации");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Пользователь уже существует");

  await prisma.user.create({
    data: {
      email,
      name,
      role: "USER",
      accountMode,
      profileKind,
      passwordHash: await hash(password, 10),
      isAdultConfirmed: true
    }
  });

  await signIn("credentials", { email, password, redirectTo: "/cabinet" });
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirectTo: "/cabinet" });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      (error.type === "CredentialsSignin" || error.type === "CallbackRouteError")
    ) {
      redirect("/auth/signin?error=credentials");
    }

    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

function normalizeAccountMode(value: string): AccountMode {
  return ["CONSUMER", "PROVIDER", "BOTH"].includes(value) ? (value as AccountMode) : "CONSUMER";
}

function normalizeProfileKind(value: string): ProfileKind {
  return ["MODEL", "OPERATOR", "STUDIO", "AGENCY", "EXPERT", "COACH", "LAWYER", "OTHER"].includes(value)
    ? (value as ProfileKind)
    : "MODEL";
}

function canProvide(accountMode?: string | null) {
  return accountMode === "PROVIDER" || accountMode === "BOTH";
}

async function resolveCoverImage(formData: FormData) {
  return await saveUploadedImage(formData.get("coverFile")) ?? optionalUrl(formData.get("coverImage"));
}

async function productImageDataUrl(value: unknown) {
  if (!isUploadedFile(value)) return null;
  if (!value.name && !value.size) return null;
  if ((value.size ?? 0) <= 0) return null;
  if ((value.size ?? 0) > 2 * 1024 * 1024) throw new Error("Фото товара слишком большое. Загрузите файл до 2 МБ");
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(value.type ?? "")) throw new Error("Фото товара должно быть JPG, PNG, WebP или GIF");

  const bytes = Buffer.from(await value.arrayBuffer());
  return `data:${value.type};base64,${bytes.toString("base64")}`;
}

async function revalidateArticle(articleId: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true, slug: true } });
  if (!article) return;

  revalidatePath("/articles");
  revalidatePath(`/articles/${article.id}`);
  revalidatePath(`/articles/${article.slug}`);
}

function normalizeArticleFormat(value: FormDataEntryValue | null) {
  const format = cleanText(value, 80);
  return [
    "Личная история",
    "Гайд / инструкция",
    "Разбор ошибки",
    "Советы новичкам",
    "Сколько я заработала",
    "Как выбрать студию",
    "Вопрос сообществу"
  ].includes(format)
    ? format
    : "Личная история";
}

const articleTopics = ["Истории", "Деньги", "Безопасность", "Работа", "Студии", "Разборы", "Инструменты", "Вопросы"];

function normalizeTopic(value: FormDataEntryValue | null, title: string, body: string) {
  const topic = cleanText(value, 80);
  return articleTopics.includes(topic)
    ? topic
    : articleTopic(title, body);
}

function requireArticleTopic(value: FormDataEntryValue | null) {
  const topic = cleanText(value, 80);
  if (!articleTopics.includes(topic)) throw new Error("Выберите рубрику статьи");
  return topic;
}

function withStatusParam(path: string, key: string, value: string) {
  const hashIndex = path.indexOf("#");
  const pathname = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  return `${pathname}${pathname.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}${hash}`;
}

const forbiddenModelVacancyPattern = /(модел|model|streamer|стример|performer|перформер)/i;

function listValues(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => cleanText(value, 80)).filter(Boolean);
}

function structuredLine(label: string, value: string | null | undefined) {
  return value ? `${label}: ${value}` : null;
}

function buildListingDescription(formData: FormData, type: ListingType, baseDescription: string) {
  const template = cleanText(formData.get("listingTemplate"), 80);
  const price = requireText(formData.get("price"), "цену", 120);
  const priceComment = cleanText(formData.get("priceComment"), 240);
  const stopConditions = cleanMultiline(formData.get("stopConditions"), 1200);

  if (type === ListingType.VACANCY && template === "vacancy-specialist-v1") {
    const vacancyRole = requireText(formData.get("vacancyRole"), "роль", 120);
    const forbiddenText = [vacancyRole, baseDescription, formData.get("title"), formData.get("requirements")].join(" ");
    if (forbiddenModelVacancyPattern.test(forbiddenText)) throw new Error("Вакансии для моделей здесь нельзя размещать. Используйте резюме моделей и другие разделы.");

    return [
      structuredLine("Роль", vacancyRole),
      structuredLine("Оплата", price),
      structuredLine("Комментарий к оплате", priceComment),
      structuredLine("График", requireText(formData.get("schedule"), "график", 240)),
      structuredLine("Занятость", cleanText(formData.get("workload"), 120)),
      structuredLine("Требования", requireMultiline(formData.get("requirements"), "требования", 2000)),
      structuredLine("Условия", listValues(formData, "benefits").join(", ")),
      structuredLine("Дополнительные условия", cleanText(formData.get("benefitsOther"), 240)),
      structuredLine("Кто не подойдет", stopConditions),
      structuredLine("Коротко", baseDescription)
    ].filter(Boolean).join("\n\n");
  }

  if (type === ListingType.SERVICE && template === "service-v1") {
    return [
      structuredLine("Категория", requireText(formData.get("serviceCategory"), "категорию услуги", 120)),
      structuredLine("Цена", price),
      structuredLine("Комментарий к цене", priceComment),
      structuredLine("Что входит", requireMultiline(formData.get("serviceIncludes"), "состав услуги", 2000)),
      structuredLine("Опыт", requireMultiline(formData.get("experience"), "опыт", 2000)),
      structuredLine("Портфолио", cleanText(formData.get("portfolioUrl"), 300)),
      structuredLine("Срок", requireText(formData.get("deliveryTime"), "срок", 180)),
      structuredLine("Доступность", cleanText(formData.get("availability"), 120)),
      structuredLine("Ограничения", stopConditions),
      structuredLine("Коротко", baseDescription)
    ].filter(Boolean).join("\n\n");
  }

  return baseDescription;
}

async function revalidateListing(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, slug: true, type: true } });
  if (!listing) return;

  revalidatePath("/vacancies");
  revalidatePath("/services");
  revalidatePath(`/listings/${listing.id}`);
}

async function revalidateProduct(productId: string) {
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
}

function normalizeProductCondition(value: FormDataEntryValue | null): ProductCondition {
  const text = String(value ?? "");
  return ["NEW", "GOOD", "USED", "NEEDS_REPAIR"].includes(text) ? (text as ProductCondition) : ProductCondition.GOOD;
}

function normalizeProductDelivery(value: FormDataEntryValue | null): ProductDelivery {
  const text = String(value ?? "");
  return ["CITY_ONLY", "DELIVERY", "ANY"].includes(text) ? (text as ProductDelivery) : ProductDelivery.ANY;
}

export async function updateProfileSettingsAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      accountMode: normalizeAccountMode(String(formData.get("accountMode") ?? "CONSUMER")),
      profileKind: normalizeProfileKind(String(formData.get("profileKind") ?? "MODEL"))
    }
  });

  revalidatePath("/cabinet");
  redirect("/cabinet?updated=profile");
}

export async function updatePublicProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const image = optionalUrl(formData.get("image"));

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: requireText(formData.get("name"), "имя", 120),
      image,
      profileBio: cleanMultiline(formData.get("profileBio"), 1200) || null
    }
  });

  revalidatePath("/cabinet");
  revalidatePath("/authors");
  revalidatePath(`/profiles/${session.user.id}`);
  revalidatePath("/articles");
  redirect("/cabinet?updated=publicProfile");
}

export async function addArticleCommentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const articleId = String(formData.get("articleId") ?? "");
  const parentId = cleanText(formData.get("parentId"), 120) || null;
  const body = cleanText(formData.get("body"), 1200);
  if (!articleId || body.length < 2) throw new Error("Комментарий слишком короткий");

  await prisma.articleComment.create({
    data: { articleId, parentId, userId: session.user.id, body }
  });

  await revalidateArticle(articleId);
}

export async function likeCommentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const commentId = String(formData.get("commentId") ?? "");
  if (!commentId) throw new Error("Comment ID missing");
  const comment = await prisma.articleComment.findUnique({ where: { id: commentId }, select: { articleId: true } });
  if (!comment) throw new Error("Комментарий не найден");

  await prisma.commentLike.upsert({
    where: { commentId_userId: { commentId, userId: session.user.id } },
    update: {},
    create: { commentId, userId: session.user.id }
  });

  await revalidateArticle(comment.articleId);
}

export async function rateArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const articleId = String(formData.get("articleId") ?? "");
  const value = Number(formData.get("value") ?? 0);
  if (!articleId || value < 1 || value > 5) throw new Error("Оценка должна быть от 1 до 5");

  await prisma.articleRating.upsert({
    where: { articleId_userId: { articleId, userId: session.user.id } },
    update: { value },
    create: { articleId, userId: session.user.id, value }
  });

  await revalidateArticle(articleId);
}


export async function repostArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const articleId = String(formData.get("articleId") ?? "");
  if (!articleId) throw new Error("Article ID missing");

  await prisma.article.update({
    where: { id: articleId },
    data: { repostCount: { increment: 1 } }
  });

  await revalidateArticle(articleId);
}

export async function respondToArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const articleId = String(formData.get("articleId") ?? "");
  if (!articleId) throw new Error("Article ID missing");

  await prisma.article.update({
    where: { id: articleId },
    data: { responseCount: { increment: 1 } }
  });

  await revalidateArticle(articleId);
}

export async function respondToListingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) throw new Error("Listing ID missing");

  await prisma.listing.update({
    where: { id: listingId },
    data: { responseCount: { increment: 1 } }
  });

  await revalidateListing(listingId);
}

export async function respondToProductAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const productId = String(formData.get("productId") ?? "");
  if (!productId) throw new Error("Product ID missing");

  await prisma.product.update({
    where: { id: productId },
    data: { responseCount: { increment: 1 } }
  });

  await revalidateProduct(productId);
}

export async function respondToResumeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const resumeId = String(formData.get("resumeId") ?? "");
  if (!resumeId) throw new Error("Resume ID missing");

  await prisma.resume.update({
    where: { id: resumeId },
    data: { responseCount: { increment: 1 } }
  });

  revalidatePath("/resumes");
}

async function requirePaidUser() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, accountMode: true }
  });

  if (!user) redirect("/auth/signin");
  if (!canProvide(user.accountMode) && user.role !== "ADMIN") throw new Error("Включите режим поставщика услуг");
  return user;
}

export async function submitBlogArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const title = requireText(formData.get("title"), "заголовок", 140);
  const summary = requireText(formData.get("summary"), "краткое описание", 260);
  const body = requireMultiline(formData.get("body"), "текст", 12000);
  const format = normalizeArticleFormat(formData.get("format"));
  const topic = requireArticleTopic(formData.get("topic"));
  const coverImage = await resolveCoverImage(formData);
  const articleId = cleanText(formData.get("draftId"), 120);

  const slug = makeSlug(title);

  if (articleId) {
    const existing = await prisma.article.findFirst({ where: { id: articleId, createdById: session.user.id } });
    if (existing) {
      const article = await prisma.article.update({
        where: { id: existing.id },
        data: {
          title,
          slug,
          summary,
          body,
          format,
          topic,
          coverImage,
          kind: "BLOG",
          status: ContentStatus.PUBLISHED,
          publishedAt: existing.publishedAt ?? new Date()
        }
      });

      await revalidateArticle(article.id);
      revalidatePath("/cabinet");
      redirect(`/articles/${article.id}`);
    }
  }

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      summary,
      body,
      format,
      topic,
      coverImage,
      kind: "BLOG",
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
      createdById: session.user.id
    }
  });

  revalidatePath("/articles");
  revalidatePath("/cabinet");
  redirect(`/articles/${article.id}`);
}

export async function saveBlogDraftAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const title = cleanText(formData.get("title"), 140) || "Черновик без заголовка";
  const summary = cleanText(formData.get("summary"), 260) || "Короткое описание появится здесь.";
  const body = cleanMultiline(formData.get("body"), 12000) || "Начните писать текст статьи.";
  const draftId = cleanText(formData.get("draftId"), 120);
  const format = normalizeArticleFormat(formData.get("format"));
  const topic = normalizeTopic(formData.get("topic"), title, body);
  const coverImage = await resolveCoverImage(formData);

  if (draftId) {
    const existing = await prisma.article.findFirst({ where: { id: draftId, createdById: session.user.id } });
    if (existing) {
      await prisma.article.update({
        where: { id: existing.id },
        data: { title, summary, body, format, topic, coverImage, status: ContentStatus.DRAFT }
      });
      revalidatePath("/cabinet");
      redirect("/cabinet?updated=draft");
    }
  }

  await prisma.article.create({
    data: {
      title,
      slug: makeSlug(title),
      summary,
      body,
      format,
      topic,
      coverImage,
      kind: "BLOG",
      status: ContentStatus.DRAFT,
      createdById: session.user.id
    }
  });

  revalidatePath("/cabinet");
  redirect("/cabinet?updated=draft");
}

export async function updateBlogArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const articleId = cleanText(formData.get("draftId"), 120);
  const existing = await prisma.article.findFirst({ where: { id: articleId, createdById: session.user.id } });
  if (!existing) throw new Error("Статья не найдена");

  const title = requireText(formData.get("title"), "заголовок", 140);
  const summary = requireText(formData.get("summary"), "краткое описание", 260);
  const body = requireMultiline(formData.get("body"), "текст", 12000);
  const format = normalizeArticleFormat(formData.get("format"));
  const topic = requireArticleTopic(formData.get("topic"));
  const coverImage = await resolveCoverImage(formData);

  const article = await prisma.article.update({
    where: { id: existing.id },
    data: {
      title,
      slug: makeSlug(title),
      summary,
      body,
      format,
      topic,
      coverImage,
      kind: "BLOG",
      status: ContentStatus.PUBLISHED,
      publishedAt: existing.publishedAt ?? new Date()
    }
  });

  await revalidateArticle(article.id);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=article#materials");
}

export async function toggleArticleVisibilityAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const articleId = cleanText(formData.get("articleId"), 120);
  const article = await prisma.article.findFirst({ where: { id: articleId, createdById: session.user.id } });
  if (!article) throw new Error("Статья не найдена");

  await prisma.article.update({
    where: { id: article.id },
    data: {
      status: article.status === ContentStatus.PUBLISHED ? ContentStatus.ARCHIVED : ContentStatus.PUBLISHED,
      hiddenReason: article.status === ContentStatus.PUBLISHED ? "Скрыто автором" : null,
      publishedAt: article.publishedAt ?? new Date()
    }
  });

  await revalidateArticle(article.id);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=article#materials");
}

export async function deleteArticleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const articleId = cleanText(formData.get("articleId"), 120);
  const article = await prisma.article.findFirst({ where: { id: articleId, createdById: session.user.id } });
  if (!article) throw new Error("Статья не найдена");

  await prisma.$transaction([
    prisma.expertSlot.deleteMany({ where: { articleId: article.id } }),
    prisma.article.delete({ where: { id: article.id } })
  ]);

  revalidatePath("/articles");
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=article#materials");
}

export async function submitArticleAction(formData: FormData) {
  const user = await requirePaidUser();
  const title = requireText(formData.get("title"), "название статьи", 140);
  const summary = requireText(formData.get("summary"), "краткое описание", 260);
  const body = requireMultiline(formData.get("body"), "текст статьи", 12000);
  const topic = requireArticleTopic(formData.get("topic"));
  const coverImage = await resolveCoverImage(formData);
  const geoCode = cleanText(formData.get("geoCode"), 80).toLowerCase() || "remote";
  const contact = cleanText(formData.get("contact"), 180) || user.email || "Контакт в профиле";

  const slug = makeSlug(title);

  const article = await prisma.article.create({
    data: {
      title,
      slug,
      kind: "EXPERT",
      summary,
      body,
      topic,
      coverImage,
      format: "Разбор ошибки",
      status: ContentStatus.PUBLISHED,
      publishedAt: new Date(),
      createdById: user.id
    }
  });

  const startsAt = new Date();
  const expiresAt = getExpertLicenseEnd(startsAt);

  await prisma.expertSlot.create({
    data: {
      articleId: article.id,
      geoCode,
      title: user.name ?? "Эксперт",
      specialization: cleanText(formData.get("specialization"), 160) || "Эксперт",
      contact,
      vacanciesUrl: optionalUrl(formData.get("vacanciesUrl")),
      isRemoteFallback: geoCode === "remote",
      startsAt,
      expiresAt
    }
  });

  revalidatePath("/articles");
  revalidatePath("/cabinet");
  redirect(`/articles/${article.id}`);
}

export async function submitListingAction(formData: FormData) {
  const user = await requirePaidUser();
  const kind = String(formData.get("kind") ?? "VACANCY") as ListingType;
  const type = kind === "SERVICE" ? ListingType.SERVICE : ListingType.VACANCY;
  const employmentType = String(formData.get("employmentType") ?? "REMOTE");
  const title = requireText(formData.get("title"), "название", 140);
  const baseDescription = requireMultiline(formData.get("description"), "описание", 1200);
  const description = buildListingDescription(formData, type, baseDescription);

  const listing = await prisma.listing.create({
    data: {
      type,
      title,
      slug: makeSlug(title),
      description,
      city: cleanText(formData.get("city"), 120) || null,
      geoCode: cleanText(formData.get("geoCode"), 80).toLowerCase() || null,
      employmentType: (["REMOTE", "OFFICE", "HYBRID"].includes(employmentType) ? employmentType : "REMOTE") as never,
      contact: requireText(formData.get("contact"), "контакт", 180),
      status: ContentStatus.PUBLISHED,
      expiresAt: listingExpiresAt(),
      createdById: user.id
    }
  });

  revalidatePath(type === ListingType.VACANCY ? "/vacancies" : "/services");
  revalidatePath("/listings");
  revalidatePath("/cabinet");
  redirect("/cabinet?created=listing");
}

export async function updateListingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const listingId = cleanText(formData.get("listingId"), 120);
  const employmentType = String(formData.get("employmentType") ?? "REMOTE");
  const listing = await prisma.listing.findFirst({ where: { id: listingId, createdById: session.user.id } });
  if (!listing) throw new Error("Размещение не найдено");
  const baseDescription = requireMultiline(formData.get("description"), "описание", 1200);
  const description = buildListingDescription(formData, listing.type, baseDescription);

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      title: requireText(formData.get("title"), "название", 140),
      description,
      city: cleanText(formData.get("city"), 120) || null,
      geoCode: cleanText(formData.get("geoCode"), 80).toLowerCase() || null,
      employmentType: (["REMOTE", "OFFICE", "HYBRID"].includes(employmentType) ? employmentType : "REMOTE") as never,
      contact: requireText(formData.get("contact"), "контакт", 180)
    }
  });

  revalidatePath(listing.type === ListingType.VACANCY ? "/vacancies" : "/services");
  revalidatePath(`/listings/${listing.id}`);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=listing#materials");
}

export async function toggleListingVisibilityAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const listingId = cleanText(formData.get("listingId"), 120);
  const listing = await prisma.listing.findFirst({ where: { id: listingId, createdById: session.user.id } });
  if (!listing) throw new Error("Размещение не найдено");

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      status: listing.status === ContentStatus.PUBLISHED ? ContentStatus.ARCHIVED : ContentStatus.PUBLISHED,
      hiddenReason: listing.status === ContentStatus.PUBLISHED ? "Скрыто автором" : null,
      expiresAt: listing.status === ContentStatus.PUBLISHED ? listing.expiresAt : listingExpiresAt()
    }
  });

  revalidatePath(listing.type === ListingType.VACANCY ? "/vacancies" : "/services");
  revalidatePath(`/listings/${listing.id}`);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=listing#materials");
}

export async function renewListingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const listingId = cleanText(formData.get("listingId"), 120);
  const listing = await prisma.listing.findFirst({ where: { id: listingId, createdById: session.user.id } });
  if (!listing) throw new Error("Размещение не найдено");
  if (listing.status !== ContentStatus.ARCHIVED) throw new Error("Продлить можно только архивное размещение");

  await prisma.listing.update({
    where: { id: listing.id },
    data: { status: ContentStatus.PUBLISHED, hiddenReason: null, expiresAt: listingExpiresAt() }
  });

  revalidatePath(listing.type === ListingType.VACANCY ? "/vacancies" : "/services");
  revalidatePath(`/listings/${listing.id}`);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=listingRenewed#materials");
}

export async function deleteListingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const listingId = cleanText(formData.get("listingId"), 120);
  const listing = await prisma.listing.findFirst({ where: { id: listingId, createdById: session.user.id } });
  if (!listing) throw new Error("Размещение не найдено");

  await prisma.listing.delete({ where: { id: listing.id } });

  revalidatePath(listing.type === ListingType.VACANCY ? "/vacancies" : "/services");
  revalidatePath("/listings");
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=listing#materials");
}

export async function submitProductAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const title = requireText(formData.get("title"), "название товара", 140);
  const imageUrl = await productImageDataUrl(formData.get("imageFile"));
  if (!imageUrl) throw new Error("Загрузите фото товара");

  const product = await prisma.product.create({
    data: {
      title,
      category: requireText(formData.get("category"), "категорию", 80),
      priceRub: cleanNumber(formData.get("priceRub"), 0, 100000000),
      city: cleanText(formData.get("city"), 120) || null,
      delivery: normalizeProductDelivery(formData.get("delivery")),
      condition: normalizeProductCondition(formData.get("condition")),
      description: requireMultiline(formData.get("description"), "описание", 3000),
      contact: requireText(formData.get("contact"), "контакт", 180),
      imageUrl,
      status: ContentStatus.PUBLISHED,
      expiresAt: productExpiresAt(),
      createdById: session.user.id
    }
  });

  await revalidateProduct(product.id);
  revalidatePath("/cabinet");
  redirect(`/cabinet?created=product&productReset=${encodeURIComponent(product.id)}#products-result`);
}

export async function updateProductAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const productId = cleanText(formData.get("productId"), 120);
  const product = await prisma.product.findFirst({ where: { id: productId, createdById: session.user.id } });
  if (!product) throw new Error("Товар не найден");

  const nextImage = await productImageDataUrl(formData.get("imageFile"));
  await prisma.product.update({
    where: { id: product.id },
    data: {
      title: requireText(formData.get("title"), "название товара", 140),
      category: requireText(formData.get("category"), "категорию", 80),
      priceRub: cleanNumber(formData.get("priceRub"), 0, 100000000),
      city: cleanText(formData.get("city"), 120) || null,
      delivery: normalizeProductDelivery(formData.get("delivery")),
      condition: normalizeProductCondition(formData.get("condition")),
      description: requireMultiline(formData.get("description"), "описание", 3000),
      contact: requireText(formData.get("contact"), "контакт", 180),
      imageUrl: nextImage ?? product.imageUrl
    }
  });

  await revalidateProduct(product.id);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=product#materials");
}

export async function toggleProductVisibilityAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const productId = cleanText(formData.get("productId"), 120);
  const product = await prisma.product.findFirst({ where: { id: productId, createdById: session.user.id } });
  if (!product) throw new Error("Товар не найден");

  await prisma.product.update({
    where: { id: product.id },
    data: {
      status: product.status === ContentStatus.PUBLISHED ? ContentStatus.ARCHIVED : ContentStatus.PUBLISHED,
      hiddenReason: product.status === ContentStatus.PUBLISHED ? "Скрыто автором" : null,
      expiresAt: product.status === ContentStatus.PUBLISHED ? product.expiresAt : productExpiresAt()
    }
  });

  await revalidateProduct(product.id);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=product#materials");
}

export async function renewProductAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const productId = cleanText(formData.get("productId"), 120);
  const product = await prisma.product.findFirst({ where: { id: productId, createdById: session.user.id } });
  if (!product) throw new Error("Товар не найден");
  if (product.status !== ContentStatus.ARCHIVED) throw new Error("Продлить можно только архивный товар");

  await prisma.product.update({
    where: { id: product.id },
    data: { status: ContentStatus.PUBLISHED, hiddenReason: null, expiresAt: productExpiresAt() }
  });

  await revalidateProduct(product.id);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=productRenewed#materials");
}

export async function deleteProductAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const productId = cleanText(formData.get("productId"), 120);
  const product = await prisma.product.findFirst({ where: { id: productId, createdById: session.user.id } });
  if (!product) throw new Error("Товар не найден");

  await prisma.product.delete({ where: { id: product.id } });

  revalidatePath("/products");
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=product#materials");
}

export async function followAuthorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const authorId = String(formData.get("authorId") ?? "");
  const next = safeInternalPath(cleanText(formData.get("next"), 500), `/profiles/${authorId}`);
  if (!authorId || authorId === session.user.id) redirect(withStatusParam(next, "follow", "skipped"));

  const existing = await prisma.follow.findUnique({
    where: { followerId_authorId: { followerId: session.user.id, authorId } }
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({ data: { followerId: session.user.id, authorId } });
  }

  revalidatePath(`/profiles/${authorId}`);
  revalidatePath("/cabinet");
  revalidatePath("/articles");
  redirect(withStatusParam(next, "follow", existing ? "removed" : "added"));
}

export async function followTopicAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const topic = normalizeTopic(formData.get("topic"), "", "");
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/articles");
  const existing = await prisma.topicFollow.findUnique({
    where: { userId_topic: { userId: session.user.id, topic } }
  });

  if (existing) {
    await prisma.topicFollow.delete({ where: { id: existing.id } });
  } else {
    await prisma.topicFollow.create({ data: { userId: session.user.id, topic } });
  }

  revalidatePath("/articles");
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "topicFollow", existing ? "removed" : "added"));
}

export async function saveListingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) throw new Error("Listing ID missing");
  await prisma.savedListing.upsert({
    where: { userId_listingId: { userId: session.user.id, listingId } },
    update: {},
    create: { userId: session.user.id, listingId }
  });

  await revalidateListing(listingId);
  revalidatePath("/cabinet");
}

export async function saveProductAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const productId = String(formData.get("productId") ?? "");
  if (!productId) throw new Error("Product ID missing");
  await prisma.savedProduct.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    update: {},
    create: { userId: session.user.id, productId }
  });

  await revalidateProduct(productId);
  revalidatePath("/cabinet");
}

export async function addListingReviewAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const listingId = cleanText(formData.get("listingId"), 120);
  const parentId = cleanText(formData.get("parentId"), 120) || null;
  const body = requireMultiline(formData.get("body"), "отзыв", 1600);
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, type: true, createdById: true } });
  if (!listing || listing.type !== ListingType.SERVICE) throw new Error("Отзывы можно оставлять только на услуги");

  if (parentId) {
    if (listing.createdById !== session.user.id) throw new Error("Отвечать на отзыв может только автор услуги");
    const parent = await prisma.listingReview.findFirst({ where: { id: parentId, listingId: listing.id, parentId: null, isHidden: false } });
    if (!parent) throw new Error("Отзыв не найден");

    await prisma.listingReview.create({
      data: { listingId: listing.id, userId: session.user.id, parentId: parent.id, body, rating: null }
    });
  } else {
    if (listing.createdById === session.user.id) throw new Error("Нельзя оставлять отзыв на собственную услугу");
    const rating = Number(formData.get("rating") ?? 0);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Оценка должна быть от 1 до 5");

    await prisma.listingReview.create({
      data: { listingId: listing.id, userId: session.user.id, body, rating }
    });
  }

  await revalidateListing(listing.id);
  revalidatePath("/admin");
  redirect(`/listings/${listing.id}?review=added#reviews`);
}

export async function updateOwnListingReviewAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const reviewId = cleanText(formData.get("reviewId"), 120);
  const body = requireMultiline(formData.get("body"), "отзыв", 1600);
  const rating = Number(formData.get("rating") ?? 0);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Оценка должна быть от 1 до 5");

  const review = await prisma.listingReview.findFirst({
    where: { id: reviewId, userId: session.user.id, parentId: null, isHidden: false },
    include: { listing: { select: { id: true, type: true, createdById: true } } }
  });
  if (!review || review.listing.type !== ListingType.SERVICE) throw new Error("Отзыв не найден");
  if (review.listing.createdById === session.user.id) throw new Error("Нельзя редактировать отзыв на собственную услугу");

  await prisma.listingReview.update({ where: { id: review.id }, data: { body, rating } });

  await revalidateListing(review.listingId);
  revalidatePath("/admin");
  redirect(`/listings/${review.listingId}?review=updated#reviews`);
}

export async function deleteOwnListingReviewAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const reviewId = cleanText(formData.get("reviewId"), 120);
  const review = await prisma.listingReview.findFirst({
    where: { id: reviewId, userId: session.user.id, parentId: null, isHidden: false },
    select: { id: true, listingId: true }
  });
  if (!review) throw new Error("Отзыв не найден");

  await prisma.listingReview.delete({ where: { id: review.id } });
  await revalidateListing(review.listingId);
  revalidatePath("/admin");
  redirect(`/listings/${review.listingId}?review=deleted#reviews`);
}

export async function deleteListingReviewAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Недостаточно прав");

  const reviewId = cleanText(formData.get("reviewId"), 120);
  const review = await prisma.listingReview.findUnique({ where: { id: reviewId }, select: { id: true, listingId: true } });
  if (!review) throw new Error("Отзыв не найден");

  await prisma.listingReview.delete({ where: { id: review.id } });
  await revalidateListing(review.listingId);
  revalidatePath("/admin");
}

export async function reportContentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const reason = cleanText(formData.get("reason"), 600) || "Проверить материал";
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/articles");
  if (!["ARTICLE", "COMMENT", "PROFILE", "LISTING", "PRODUCT"].includes(targetType) || !targetId) throw new Error("Некорректная жалоба");

  await prisma.report.create({
    data: {
      targetType: targetType as never,
      targetId,
      reason,
      reporterId: session.user.id
    }
  });

  revalidatePath("/admin");
  revalidatePath("/articles");
  revalidatePath("/authors");
  revalidatePath("/vacancies");
  revalidatePath("/services");
  revalidatePath("/products");
  redirect(withStatusParam(next, "reported", "1"));
}

export async function reviewReportAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Недостаточно прав");

  const reportId = String(formData.get("reportId") ?? "");
  const decision = String(formData.get("decision") ?? "resolve");
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Жалоба не найдена");

  const status = decision === "hide" ? "HIDDEN" : "RESOLVED";
  await prisma.report.update({
    where: { id: report.id },
    data: { status: status as never, reviewedAt: new Date(), reviewedById: session.user.id }
  });

  if (decision === "hide") {
    if (report.targetType === "ARTICLE") {
      await prisma.article.update({ where: { id: report.targetId }, data: { status: ContentStatus.ARCHIVED, hiddenReason: report.reason } }).catch(() => null);
    }
    if (report.targetType === "COMMENT") {
      await prisma.articleComment.update({ where: { id: report.targetId }, data: { isHidden: true, hiddenReason: report.reason } }).catch(() => null);
    }
    if (report.targetType === "LISTING") {
      await prisma.listing.update({ where: { id: report.targetId }, data: { status: ContentStatus.ARCHIVED, hiddenReason: report.reason } }).catch(() => null);
    }
    if (report.targetType === "PRODUCT") {
      await prisma.product.update({ where: { id: report.targetId }, data: { status: ContentStatus.ARCHIVED, hiddenReason: report.reason } }).catch(() => null);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/articles");
  revalidatePath("/vacancies");
  revalidatePath("/services");
  revalidatePath("/products");
}

function cleanList(formData: FormData, name: string, maxItems = 8) {
  return formData
    .getAll(name)
    .map((value) => cleanText(value, 140))
    .filter(Boolean)
    .slice(0, maxItems);
}

function listLine(label: string, values: string[]) {
  return `${label}: ${values.length ? values.join(", ") : "не указано"}`;
}

function textLine(label: string, value: FormDataEntryValue | null, fallback = "не указано") {
  const text = cleanText(value, 180);
  return `${label}: ${text || fallback}`;
}

function modelExperienceLabel(value: FormDataEntryValue | null) {
  const months = cleanNumber(value, 0, 600);
  if (months >= 18) return "Профи (1+ год)";
  if (months >= 9) return "Опытная (6-12 мес)";
  if (months >= 3) return "Есть небольшой опыт (1-6 мес)";
  return "Новичок (0-1 мес)";
}

function buildModelResumeBio(formData: FormData) {
  if (formData.get("resumeConfirm") !== "on") throw new Error("Нужно подтвердить актуальность требований");

  const about = cleanMultiline(formData.get("about"), 300) || "не указано";
  const city = cleanText(formData.get("city"), 120);
  const blockedStudios = cleanMultiline(formData.get("blockedStudios"), 800);
  const stopOther = cleanText(formData.get("stopOther"), 240);

  return [
    "О СЕБЕ",
    about,
    "",
    "ОСНОВНОЕ",
    textLine("Возраст", formData.get("ageRange")),
    `Город: ${city || "не указано"}`,
    `Опыт: ${modelExperienceLabel(formData.get("experienceMonths"))}`,
    listLine("Языки", cleanList(formData, "languages", 4)),
    "",
    "ГРАФИК И ДИСЦИПЛИНА",
    textLine("Смен в неделю", formData.get("shiftsPerWeek")),
    textLine("Смен в месяц", formData.get("shiftsPerMonth")),
    textLine("Длительность смены", formData.get("shiftLength")),
    textLine("Пропуски", formData.get("missedShifts")),
    textLine("Доп. смены / праздники", formData.get("extraShifts")),
    "",
    "ФИНАНСЫ",
    textLine("Минимальный процент", formData.get("minimumPercent")),
    textLine("Минимальный доход в месяц", formData.get("minimumIncome")),
    textLine("Частота выплат", formData.get("payoutFrequency")),
    "",
    "ТРЕБОВАНИЯ К СТУДИИ",
    listLine("Оборудование", cleanList(formData, "equipmentRequirements")),
    listLine("Комната", cleanList(formData, "roomRequirements")),
    textLine("Интерьер", formData.get("interiorStyle")),
    listLine("Организация", cleanList(formData, "orgRequirements")),
    "",
    "СТОП-ЛИСТ",
    `Стоп-студии: ${blockedStudios || "не указано"}`,
    listLine("Запрещенные условия", cleanList(formData, "stopConditions")),
    `Другое: ${stopOther || "не указано"}`
  ].join("\n").slice(0, 6000);
}

export async function createResumeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const title = requireText(formData.get("title"), "заголовок резюме", 140);
  const roleGoal = requireText(formData.get("roleGoal"), "желаемая роль", 120);
  const bio =
    cleanText(formData.get("resumeTemplate"), 80) === "model-v1"
      ? buildModelResumeBio(formData)
      : requireMultiline(formData.get("bio"), "о себе", 6000);

  await prisma.resume.upsert({
    where: { userId: session.user.id },
    update: {
      title,
      bio,
      city: cleanText(formData.get("city"), 120) || null,
      roleGoal,
      experienceMonths: cleanNumber(formData.get("experienceMonths"), 0, 600),
      contactEmail: cleanText(formData.get("contactEmail"), 255) || null,
      contactTelegram: cleanText(formData.get("contactTelegram"), 120) || null,
      lastVisitedAt: new Date(),
      hiddenByInactivity: false,
      expiresAt: resumeExpiresAt()
    },
    create: {
      userId: session.user.id,
      title,
      bio,
      city: cleanText(formData.get("city"), 120) || null,
      roleGoal,
      experienceMonths: cleanNumber(formData.get("experienceMonths"), 0, 600),
      contactEmail: cleanText(formData.get("contactEmail"), 255) || null,
      contactTelegram: cleanText(formData.get("contactTelegram"), 120) || null,
      expiresAt: resumeExpiresAt()
    }
  });

  revalidatePath("/resumes");
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=resume#materials");
}

export async function renewResumeAction() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const resume = await prisma.resume.findUnique({ where: { userId: session.user.id } });
  if (!resume) throw new Error("Резюме не найдено");
  if (!resume.expiresAt || resume.expiresAt > new Date()) throw new Error("Продлить можно только архивное резюме");

  await prisma.resume.update({
    where: { id: resume.id },
    data: { hiddenByInactivity: false, lastVisitedAt: new Date(), expiresAt: resumeExpiresAt() }
  });

  revalidatePath("/resumes");
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=resumeRenewed#materials");
}

export async function requestResumeUnlockAction(formData: FormData) {
  const user = await requirePaidUser();
  const resumeId = String(formData.get("resumeId") ?? "");
  if (!resumeId) throw new Error("Resume ID missing");
  const resume = await prisma.resume.findFirst({ where: { id: resumeId, isPublic: true, hiddenByInactivity: false, expiresAt: { gt: new Date() } }, select: { userId: true } });
  if (!resume) throw new Error("Резюме не найдено");
  if (resume.userId === user.id) throw new Error("Нельзя разблокировать собственное резюме");

  await prisma.payment.create({
    data: {
      payerId: user.id,
      type: PaymentType.RESUME_UNLOCK,
      amountUsd: new Prisma.Decimal(10),
      txHash: cleanText(formData.get("txHash"), 180) || null,
      receiptImageUrl: optionalUrl(formData.get("receiptImageUrl")),
      referenceType: "resume_unlock",
      referenceId: resumeId,
      status: PaymentStatus.PENDING
    }
  });

  revalidatePath("/resumes");
  redirect("/resumes?unlock=pending");
}

export async function reviewPaymentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Недостаточно прав");

  const paymentId = String(formData.get("paymentId") ?? "");
  const decision = String(formData.get("decision") ?? "reject");

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Платеж не найден");
  if (payment.status !== PaymentStatus.PENDING) throw new Error("Платеж уже обработан");

  if (decision === "approve") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.VERIFIED, reviewedAt: new Date(), reviewedById: session.user.id }
    });

    if (payment.referenceType === "article") {
      await prisma.article.update({ where: { id: payment.referenceId }, data: { status: ContentStatus.PUBLISHED, publishedAt: new Date() } });
    }

    if (payment.referenceType === "listing") {
      await prisma.listing.update({
        where: { id: payment.referenceId },
        data: { status: ContentStatus.PUBLISHED, expiresAt: listingExpiresAt() }
      });
    }

    if (payment.referenceType === "resume_unlock") {
      await prisma.resumeContactUnlock.create({
        data: {
          resumeId: payment.referenceId,
          studioId: payment.payerId,
          expiresAt: getResumeUnlockEnd(new Date())
        }
      });
    }
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
        rejectionReason: String(formData.get("reason") ?? "Отклонено администратором")
      }
    });
  }

  revalidatePath("/admin");
  revalidatePath("/cabinet");
  revalidatePath("/resumes");
}
