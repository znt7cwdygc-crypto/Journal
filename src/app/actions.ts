"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AccountMode, BalanceTxType, ContentStatus, InviteStatus, ListingType, PaymentStatus, PaymentType, Prisma, ProductCondition, ProductDelivery, ProfileKind } from "@prisma/client";
import { auth, signIn, signOut } from "@/auth";
import { getExpertLicenseEnd, getResumeUnlockEnd } from "@/lib/licenses";
import { normalizeArticleBody, stripArticleHtml } from "@/lib/article-html";
import { prisma } from "@/lib/prisma";
import { listingExpiresAt, matchProfileExpiresAt, productExpiresAt, resumeExpiresAt } from "@/lib/publication-periods";
import { safeInternalPath } from "@/lib/safe-redirect";
import { articleSeoPath } from "@/lib/seo-url";
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
  if ((value.size ?? 0) > 350 * 1024) throw new Error("Фото товара слишком большое. Загрузите сжатое фото до 350 КБ");
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

function requireArticleBody(value: FormDataEntryValue | null) {
  const body = normalizeArticleBody(value);
  const text = stripArticleHtml(body);
  if (text.length < 2) throw new Error("Заполните текст статьи");
  if (body.length > 12000) throw new Error("текст слишком длинный");
  return body;
}

function cleanArticleDraftBody(value: FormDataEntryValue | null) {
  const body = normalizeArticleBody(value, "Начните писать текст статьи.");
  return body.length > 12000 ? body.slice(0, 12000) : body;
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
    const forbiddenText = vacancyRole;
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

  if (type === ListingType.SERVICE && template === "service-v2") {
    const audience = cleanText(formData.get("audience"), 120);
    const category = requireText(formData.get("serviceCategory"), "категорию услуги", 120);
    const serviceIncludes = cleanMultiline(formData.get("serviceIncludes"), 2000);
    const formatService = cleanText(formData.get("formatService"), 80);
    const duration = cleanText(formData.get("duration"), 120);
    const guarantee = cleanText(formData.get("guarantee"), 120);
    const payFormat = cleanText(formData.get("payFormat"), 120);
    const payMethods = cleanText(formData.get("payMethods"), 300);
    const prepay = cleanText(formData.get("prepay"), 120);
    const prepayImp = cleanText(formData.get("prepayImportance"), 20);
    const minOrder = cleanText(formData.get("minOrder"), 200);
    const minOrderImp = cleanText(formData.get("minOrderImportance"), 20);
    const access = cleanText(formData.get("access"), 300);
    const accessImp = cleanText(formData.get("accessImportance"), 20);
    const nda = cleanText(formData.get("nda"), 120);
    const ndaImp = cleanText(formData.get("ndaImportance"), 20);
    const providerType = cleanText(formData.get("providerType"), 120);
    const providerExp = cleanText(formData.get("providerExp"), 120);
    const portfolio = cleanText(formData.get("portfolio"), 300);
    const quickWishes = cleanText(formData.get("quickWishes"), 500);
    const wishesText = cleanMultiline(formData.get("wishesText"), 1000);

    const impLabel = (v: string) => v === "must" ? "(обязательно)" : v === "nice" ? "(желательно)" : v === "none" ? "(не важно)" : "";

    return [
      structuredLine("Для кого", audience),
      structuredLine("Категория", category),
      structuredLine("Что входит", serviceIncludes),
      structuredLine("Формат оказания", formatService),
      structuredLine("Срок выполнения", duration),
      structuredLine("Гарантии", guarantee),
      structuredLine("Цена", price),
      structuredLine("Формат оплаты", payFormat),
      structuredLine("Способ оплаты", payMethods),
      structuredLine("Предоплата", prepay ? `${prepay} ${impLabel(prepayImp)}` : ""),
      structuredLine("Мин. объём заказа", minOrder ? `${minOrder} ${impLabel(minOrderImp)}` : ""),
      structuredLine("Нужны доступы/данные", access ? `${access} ${impLabel(accessImp)}` : ""),
      structuredLine("Конфиденциальность", nda ? `${nda} ${impLabel(ndaImp)}` : ""),
      structuredLine("Тип исполнителя", providerType),
      structuredLine("Опыт", providerExp),
      structuredLine("Портфолио", portfolio),
      structuredLine("Бонусы", quickWishes),
      structuredLine("Дополнительно", wishesText),
      structuredLine("Ограничения", stopConditions),
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

const matchRoles = ["MODEL", "OPERATOR"] as const;
const matchLookingFor = ["MODEL", "OPERATOR", "BOTH"] as const;
const matchFormats = ["REMOTE", "OFFICE", "HYBRID"] as const;

function normalizeMatchOption<T extends readonly string[]>(value: FormDataEntryValue | null, allowed: T, fallback: T[number]) {
  const text = String(value ?? "");
  return allowed.includes(text) ? text : fallback;
}

function buildMatchProfileBio(formData: FormData) {
  const workFormat = String(formData.get("workFormat") ?? "REMOTE");
  const workFormatLabel = workFormat === "OFFICE" ? "В студии" : workFormat === "HYBRID" ? "Гибрид" : "Удаленно";
  const needHelp = listValues(formData, "needHelp");
  const specialization = listValues(formData, "specialization");
  const platforms = listValues(formData, "platforms");
  const load = listValues(formData, "load");
  const payFormat = cleanText(formData.get("payFormat"), 160);
  const portfolio = cleanText(formData.get("portfolio"), 240);
  const requirementFields = [
    ["expReqM", "Опыт оператора"],
    ["skillsReqM", "Навыки оператора"],
    ["availReqM", "Доступность оператора"],
    ["ndaReqM", "Конфиденциальность"],
    ["genderReqM", "Пол оператора"],
    ["categoryReqO", "Категория модели"],
    ["expReqO", "Опыт модели"],
    ["volumeReqO", "Объем контента"],
    ["termReqO", "Долгосрочность"],
    ["genderReqO", "Пол модели"]
  ] as const;
  const requirementLines = requirementFields
    .map(([field, label]) => {
      const values = listValues(formData, field);
      const level = cleanText(formData.get(`${field}Importance`), 20);
      const levelLabel = level === "must" ? "обязательно" : level === "nice" ? "желательно" : "не важно";
      return values.length ? `${label}: ${values.join(", ")} (${levelLabel})` : null;
    })
    .filter(Boolean);

  return [
    needHelp.length ? listLine("Нужна помощь", needHelp) : null,
    specialization.length ? listLine("Специализация", specialization) : null,
    platforms.length ? listLine("Платформы", platforms) : null,
    load.length ? listLine("Загрузка / занятость", load) : null,
    structuredLine("Формат оплаты", payFormat),
    requirementLines.length ? ["ТРЕБОВАНИЯ", ...requirementLines].join("\n") : null,
    structuredLine("Опыт", requireText(formData.get("experience"), "опыт", 120)),
    structuredLine("График", requireText(formData.get("schedule"), "график", 180)),
    structuredLine("Часовой пояс", cleanText(formData.get("timezone"), 80)),
    structuredLine("Процент от и до", cleanText(formData.get("operatorPercent"), 80)),
    structuredLine("Текущий чек", cleanText(formData.get("currentCheck"), 120)),
    structuredLine("Ниша", cleanText(formData.get("niche"), 160)),
    structuredLine("Формат работы", workFormatLabel),
    structuredLine("Портфолио", portfolio),
    structuredLine("О себе / ожидания", requireMultiline(formData.get("bio"), "описание", 2000))
  ].filter(Boolean).join("\n\n");
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
  const body = requireArticleBody(formData.get("body"));
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
      redirect(`/cabinet?created=article&articleId=${encodeURIComponent(article.id)}#article-result`);
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
  redirect(`/cabinet?created=article&articleId=${encodeURIComponent(article.id)}#article-result`);
}

export async function saveBlogDraftAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const title = cleanText(formData.get("title"), 140) || "Черновик без заголовка";
  const summary = cleanText(formData.get("summary"), 260) || "Короткое описание появится здесь.";
  const body = cleanArticleDraftBody(formData.get("body"));
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
  const body = requireArticleBody(formData.get("body"));
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
  redirect(articleSeoPath(article));
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
  redirect(`/cabinet?created=${type === ListingType.VACANCY ? "vacancy" : "service"}&listingId=${encodeURIComponent(listing.id)}#listing-result`);
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

  let productId = "";
  try {
    const title = requireText(formData.get("title"), "название товара", 140);
    const imageUrl = await productImageDataUrl(formData.get("imageFile"));
    if (!imageUrl) throw new Error("Загрузите фото товара");
    const category = requireText(formData.get("category"), "категорию", 80);
    const priceRub = cleanNumber(formData.get("priceRub"), 0, 100000000);
    const city = cleanText(formData.get("city"), 120) || null;
    const delivery = normalizeProductDelivery(formData.get("delivery"));
    const condition = normalizeProductCondition(formData.get("condition"));
    const description = requireMultiline(formData.get("description"), "описание", 3000);
    const contact = requireText(formData.get("contact"), "контакт", 180);
    const recentDuplicate = await prisma.product.findFirst({
      where: {
        createdById: session.user.id,
        title,
        priceRub,
        contact,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
      },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });

    if (recentDuplicate) {
      productId = recentDuplicate.id;
    } else {
      const product = await prisma.product.create({
        data: {
          title,
          category,
          priceRub,
          city,
          delivery,
          condition,
          description,
          contact,
          imageUrl,
          status: ContentStatus.PUBLISHED,
          expiresAt: productExpiresAt(),
          createdById: session.user.id
        }
      });
      productId = product.id;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось опубликовать товар";
    redirect(`/cabinet?productError=${encodeURIComponent(message.slice(0, 180))}#products`);
  }

  await revalidateProduct(productId);
  revalidatePath("/cabinet");
  redirect(`/cabinet?created=product&productReset=${encodeURIComponent(productId)}#products-result`);
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
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/cabinet#materials");
  if (!listingId) throw new Error("Listing ID missing");
  const existing = await prisma.savedListing.findUnique({
    where: { userId_listingId: { userId: session.user.id, listingId } }
  });

  if (existing) {
    await prisma.savedListing.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedListing.create({
      data: { userId: session.user.id, listingId }
    });
  }

  await revalidateListing(listingId);
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "favorite", existing ? "removed" : "added"));
}

export async function saveProductAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const productId = String(formData.get("productId") ?? "");
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/cabinet#materials");
  if (!productId) throw new Error("Product ID missing");
  const existing = await prisma.savedProduct.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } }
  });

  if (existing) {
    await prisma.savedProduct.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedProduct.create({ data: { userId: session.user.id, productId } });
  }

  await revalidateProduct(productId);
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "favorite", existing ? "removed" : "added"));
}

export async function saveResumeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const resumeId = cleanText(formData.get("resumeId"), 120);
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/resumes");
  if (!resumeId) throw new Error("Resume ID missing");
  const existing = await prisma.savedResume.findUnique({
    where: { userId_resumeId: { userId: session.user.id, resumeId } }
  });

  if (existing) {
    await prisma.savedResume.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedResume.create({ data: { userId: session.user.id, resumeId } });
  }

  revalidatePath("/resumes");
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "favorite", existing ? "removed" : "added"));
}

export async function saveMatchProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const matchProfileId = cleanText(formData.get("matchProfileId"), 120);
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/model-operator");
  if (!matchProfileId) throw new Error("Match profile ID missing");
  const existing = await prisma.savedMatchProfile.findUnique({
    where: { userId_matchProfileId: { userId: session.user.id, matchProfileId } }
  });

  if (existing) {
    await prisma.savedMatchProfile.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedMatchProfile.create({ data: { userId: session.user.id, matchProfileId } });
  }

  revalidatePath("/model-operator");
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "favorite", existing ? "removed" : "added"));
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

export type ReportContentState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function reportContentAction(_state: ReportContentState, formData: FormData): Promise<ReportContentState> {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const reason = cleanText(formData.get("reason"), 500);
  if (!["ARTICLE", "COMMENT", "PROFILE", "LISTING", "PRODUCT", "RESUME", "MATCH_PROFILE", "INVITE"].includes(targetType) || !targetId) {
    return { status: "error", message: "Некорректная жалоба." };
  }
  if (reason.length < 10) {
    return { status: "error", message: "Опишите причину жалобы." };
  }

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
  revalidatePath("/resumes");
  revalidatePath("/model-operator");
  return { status: "success", message: "Жалоба отправлена в модерацию." };
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
    if (report.targetType === "RESUME") {
      await prisma.resume.update({ where: { id: report.targetId }, data: { isPublic: false } }).catch(() => null);
    }
    if (report.targetType === "MATCH_PROFILE") {
      await prisma.matchProfile.update({ where: { id: report.targetId }, data: { status: ContentStatus.ARCHIVED, hiddenReason: report.reason } }).catch(() => null);
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

function importanceText(formData: FormData, field: string) {
  const level = cleanText(formData.get(`${field}Importance`), 20);
  if (level === "must") return "обязательно";
  if (level === "nice") return "желательно";
  return "не важно";
}

function textLineWithImportance(formData: FormData, label: string, value: FormDataEntryValue | null, field: string) {
  return `${textLine(label, value)} (${importanceText(formData, field)})`;
}

function listLineWithImportance(formData: FormData, label: string, values: string[], field: string) {
  return `${listLine(label, values)} (${importanceText(formData, field)})`;
}

function buildSpecialistResumeQuizBio(formData: FormData) {
  if (formData.get("resumeConfirm") !== "on") throw new Error("Нужно подтвердить актуальность требований");

  const position = cleanList(formData, "specPosition", 12);
  const exp = cleanList(formData, "specExperience", 2);
  const searchStatus = cleanList(formData, "specSearchStatus", 2);
  const employment = cleanList(formData, "specEmployment", 4);
  const schedule = cleanList(formData, "specSchedule", 4);
  const income = cleanList(formData, "specIncome", 3);
  const skills = cleanList(formData, "specSkills", 12);
  const education = cleanList(formData, "specEducation", 2);
  const langs = cleanList(formData, "specLanguages", 8);
  const quickWishes = cleanList(formData, "quickWishes", 8);
  const wishesText = cleanMultiline(formData.get("wishesText"), 1200);

  return [
    "О СЕБЕ",
    listLine("Должность", position),
    listLine("Опыт", exp),
    listLine("Статус поиска", searchStatus),
    listLine("Занятость", employment),
    listLine("Желаемый график", schedule),
    listLine("Ожидаемый доход", income),
    listLine("Навыки", skills),
    listLine("Образование", education),
    listLine("Языки", langs),
    "",
    "ФИНАНСОВЫЕ ТРЕБОВАНИЯ",
    textLineWithImportance(formData, "Минимальная зарплата", formData.get("specSalaryValue"), "specSalary"),
    listLineWithImportance(formData, "Формат оплаты", cleanList(formData, "specPayFormat", 4), "specPayFormat"),
    listLineWithImportance(formData, "Периодичность выплат", cleanList(formData, "specPayFrequency", 4), "specPayFrequency"),
    listLineWithImportance(formData, "Испытательный срок", cleanList(formData, "specProbation", 4), "specProbation"),
    "",
    "УСЛОВИЯ РАБОТЫ",
    listLineWithImportance(formData, "Формат работы", cleanList(formData, "specWorkFormat", 4), "specWorkFormat"),
    listLineWithImportance(formData, "Оборудование", cleanList(formData, "specEquipment", 4), "specEquipment"),
    textLineWithImportance(formData, "Локация", cleanText(formData.get("specLocationValue"), 120), "specLocation"),
    listLineWithImportance(formData, "Доп. условия", cleanList(formData, "specBenefits", 8), "specBenefits"),
    "",
    "КОМАНДА",
    listLineWithImportance(formData, "Пол руководителя", cleanList(formData, "specManagerGender", 4), "specManagerGender"),
    listLineWithImportance(formData, "Состав команды", cleanList(formData, "specTeamGender", 4), "specTeamGender"),
    listLineWithImportance(formData, "Размер команды", cleanList(formData, "specTeamSize", 4), "specTeamSize"),
    "",
    "ДОП. ПОЖЕЛАНИЯ",
    listLine("Быстрый выбор", quickWishes),
    `Своими словами: ${wishesText || "не указано"}`
  ].join("\n").slice(0, 6000);
}

function buildModelResumeQuizBio(formData: FormData) {
  if (formData.get("resumeConfirm") !== "on") throw new Error("Нужно подтвердить актуальность требований");

  const categories = cleanList(formData, "categories", 12);
  const experience = cleanList(formData, "modelExperience", 2);
  const status = cleanList(formData, "modelSearchStatus", 2);
  const workFormat = cleanList(formData, "workFormatModel", 2);
  const sites = cleanList(formData, "sites", 12);
  const languages = cleanList(formData, "languages", 8);
  const quickWishes = cleanList(formData, "quickWishes", 8);
  const wishesText = cleanMultiline(formData.get("wishesText"), 1200);
  const location = cleanText(formData.get("city"), 120);

  return [
    "О СЕБЕ",
    listLine("Категории", categories),
    listLine("Опыт", experience),
    listLine("Статус поиска", status),
    listLine("Формат работы", workFormat),
    textLine("Смен в неделю", formData.get("shiftsPerWeek")),
    textLine("Длительность смены", formData.get("shiftLength")),
    listLine("Средний доход за смену", cleanList(formData, "incomePerShift", 3)),
    listLine("Сайты", sites),
    listLine("Языки", languages),
    "",
    "ФИНАНСЫ",
    textLineWithImportance(formData, "Минимальный процент", formData.get("minimumPercent"), "minimumPercent"),
    listLineWithImportance(formData, "Формат расчета", cleanList(formData, "payFormat", 4), "payFormat"),
    listLineWithImportance(formData, "Частота выплат", cleanList(formData, "payoutFrequency", 4), "payoutFrequency"),
    listLineWithImportance(formData, "Способ выплаты", cleanList(formData, "payMethod", 6), "payMethod"),
    listLineWithImportance(formData, "Бонусная система", cleanList(formData, "bonus", 2), "bonus"),
    listLineWithImportance(formData, "Штрафы и удержания", cleanList(formData, "penalty", 3), "penalty"),
    "",
    "ТРЕБОВАНИЯ К СТУДИИ",
    listLineWithImportance(formData, "Комната", cleanList(formData, "roomRequirements", 4), "room"),
    listLineWithImportance(formData, "Оборудование", cleanList(formData, "equipmentRequirements", 8), "equipmentRequirements"),
    listLineWithImportance(formData, "График студии", cleanList(formData, "studioSchedule", 4), "studioSchedule"),
    listLineWithImportance(formData, "Безопасность", cleanList(formData, "security", 6), "security"),
    textLineWithImportance(formData, "Локация", location, "location"),
    listLineWithImportance(formData, "Удобства", cleanList(formData, "amenities", 8), "amenities"),
    "",
    "КОМАНДА",
    listLineWithImportance(formData, "Состав моделей", cleanList(formData, "modelsTeam", 4), "modelsTeam"),
    listLineWithImportance(formData, "Пол администраторов/коучей", cleanList(formData, "adminsGender", 4), "adminsGender"),
    listLineWithImportance(formData, "Пол управляющего", cleanList(formData, "managerGender", 4), "managerGender"),
    "",
    "ДОП. ПОЖЕЛАНИЯ",
    listLine("Быстрый выбор", quickWishes),
    `Своими словами: ${wishesText || "не указано"}`
  ].join("\n").slice(0, 6000);
}

export async function createResumeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const title = requireText(formData.get("title"), "заголовок резюме", 140);
  const roleGoal = requireText(formData.get("roleGoal"), "желаемая роль", 120);
  const resumeTemplate = cleanText(formData.get("resumeTemplate"), 80);
  const bio =
    resumeTemplate === "model-quiz-v2"
      ? buildModelResumeQuizBio(formData)
      : resumeTemplate === "specialist-quiz-v1"
      ? buildSpecialistResumeQuizBio(formData)
      : resumeTemplate === "model-v1"
      ? buildModelResumeBio(formData)
      : requireMultiline(formData.get("bio"), "о себе", 6000);

  const resume = await prisma.resume.upsert({
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
  redirect(`/cabinet?updated=resume&resumeId=${encodeURIComponent(resume.id)}#resume-result`);
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

export async function submitMatchProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, profileKind: true }
  });
  if (!user) redirect("/auth/signin");
  if (!matchRoles.includes(user.profileKind as (typeof matchRoles)[number])) {
    throw new Error("Анкету в разделе «Модель оператор» могут публиковать только модели и операторы");
  }

  const seekerRole = normalizeMatchOption(formData.get("seekerRole"), matchRoles, user.profileKind === "OPERATOR" ? "OPERATOR" : "MODEL");
  const lookingFor = normalizeMatchOption(formData.get("lookingFor"), matchLookingFor, seekerRole === "MODEL" ? "OPERATOR" : "MODEL");
  const workFormat = normalizeMatchOption(formData.get("workFormat"), matchFormats, "REMOTE");
  const title = requireText(formData.get("title"), "заголовок", 140);
  const bio = buildMatchProfileBio(formData);

  const profile = await prisma.matchProfile.upsert({
    where: { userId: user.id },
    update: {
      seekerRole,
      lookingFor,
      title,
      city: cleanText(formData.get("city"), 120) || null,
      timezone: cleanText(formData.get("timezone"), 80) || null,
      experience: requireText(formData.get("experience"), "опыт", 120),
      schedule: requireText(formData.get("schedule"), "график", 180),
      operatorPercent: cleanText(formData.get("operatorPercent"), 80) || null,
      currentCheck: cleanText(formData.get("currentCheck"), 120) || null,
      niche: cleanText(formData.get("niche"), 160) || null,
      workFormat,
      bio,
      contact: requireText(formData.get("contact"), "контакт", 180),
      status: ContentStatus.PUBLISHED,
      hiddenReason: null,
      expiresAt: matchProfileExpiresAt()
    },
    create: {
      userId: user.id,
      seekerRole,
      lookingFor,
      title,
      city: cleanText(formData.get("city"), 120) || null,
      timezone: cleanText(formData.get("timezone"), 80) || null,
      experience: requireText(formData.get("experience"), "опыт", 120),
      schedule: requireText(formData.get("schedule"), "график", 180),
      operatorPercent: cleanText(formData.get("operatorPercent"), 80) || null,
      currentCheck: cleanText(formData.get("currentCheck"), 120) || null,
      niche: cleanText(formData.get("niche"), 160) || null,
      workFormat,
      bio,
      contact: requireText(formData.get("contact"), "контакт", 180),
      status: ContentStatus.PUBLISHED,
      expiresAt: matchProfileExpiresAt()
    }
  });

  revalidatePath("/model-operator");
  revalidatePath("/cabinet");
  redirect(`/cabinet?created=matchProfile&matchProfileId=${encodeURIComponent(profile.id)}#match-result`);
}

export async function renewMatchProfileAction() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const profile = await prisma.matchProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) throw new Error("Анкета не найдена");

  await prisma.matchProfile.update({
    where: { id: profile.id },
    data: { status: ContentStatus.PUBLISHED, hiddenReason: null, expiresAt: matchProfileExpiresAt() }
  });

  revalidatePath("/model-operator");
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=matchProfileRenewed#materials");
}

export async function respondToMatchProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const profileId = cleanText(formData.get("matchProfileId"), 120);
  await prisma.matchProfile.update({
    where: { id: profileId },
    data: { responseCount: { increment: 1 } }
  });

  revalidatePath("/model-operator");
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

// ─── Invite system ───────────────────────────────────────────────────

const INVITE_COST_CENTS = 1500;
const INVITE_DAILY_LIMIT = 10;
const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

export async function sendInviteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, accountMode: true }
  });
  if (!user || !canProvide(user.accountMode)) throw new Error("Включите режим поставщика услуг");

  const resumeId = String(formData.get("resumeId") ?? "");
  const quizAnswers = String(formData.get("quizAnswers") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const offeredPercent = formData.get("offeredPercent") ? cleanNumber(formData.get("offeredPercent"), 1, 100) : null;

  if (!resumeId) throw new Error("Resume ID missing");
  if (message.length < 20) throw new Error("Сообщение должно быть не менее 20 символов");

  try { JSON.parse(quizAnswers); } catch { throw new Error("Некорректные ответы квиза"); }

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, isPublic: true, hiddenByInactivity: false },
    select: { id: true, userId: true }
  });
  if (!resume) throw new Error("Резюме не найдено");
  if (resume.userId === user.id) throw new Error("Нельзя отправить инвайт самому себе");

  const balance = await prisma.studioBalance.findUnique({ where: { userId: user.id } });
  if (!balance || balance.availableUsd < INVITE_COST_CENTS) throw new Error("Недостаточно средств на балансе");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.invite.count({
    where: { studioId: user.id, createdAt: { gte: todayStart } }
  });
  if (todayCount >= INVITE_DAILY_LIMIT) throw new Error(`Лимит ${INVITE_DAILY_LIMIT} инвайтов в день`);

  const duplicate = await prisma.invite.findFirst({
    where: { resumeId, studioId: user.id, status: InviteStatus.PENDING }
  });
  if (duplicate) throw new Error("У вас уже есть активный инвайт на это резюме");

  await prisma.$transaction(async (tx) => {
    const invite = await tx.invite.create({
      data: {
        resumeId,
        studioId: user.id,
        modelId: resume.userId,
        quizAnswers,
        message,
        offeredPercent,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS)
      }
    });

    const holdTx = await tx.balanceTransaction.create({
      data: {
        userId: user.id,
        type: BalanceTxType.HOLD,
        amountCents: INVITE_COST_CENTS,
        inviteId: invite.id,
        note: `Hold for invite ${invite.id}`
      }
    });

    await tx.invite.update({ where: { id: invite.id }, data: { holdTxId: holdTx.id } });

    await tx.studioBalance.update({
      where: { userId: user.id },
      data: {
        availableUsd: { decrement: INVITE_COST_CENTS },
        holdUsd: { increment: INVITE_COST_CENTS }
      }
    });

    await tx.resume.update({
      where: { id: resumeId },
      data: { responseCount: { increment: 1 } }
    });
  });

  revalidatePath("/resumes");
  revalidatePath("/cabinet");
  redirect(`/resumes/${resumeId}?invited=1`);
}

export async function respondInviteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const inviteId = String(formData.get("inviteId") ?? "");
  const response = String(formData.get("response") ?? "");
  if (!inviteId || !["accept", "decline"].includes(response)) throw new Error("Некорректный ответ");

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new Error("Инвайт не найден");
  if (invite.modelId !== session.user.id) throw new Error("Нет доступа");
  if (invite.status !== InviteStatus.PENDING) throw new Error("Инвайт уже обработан");

  if (response === "accept") {
    await prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED, respondedAt: new Date() }
      });

      await tx.balanceTransaction.create({
        data: {
          userId: invite.studioId,
          type: BalanceTxType.CHARGE,
          amountCents: INVITE_COST_CENTS,
          inviteId: invite.id,
          note: `Charge for accepted invite ${invite.id}`
        }
      });

      await tx.studioBalance.update({
        where: { userId: invite.studioId },
        data: { holdUsd: { decrement: INVITE_COST_CENTS } }
      });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.DECLINED, respondedAt: new Date() }
      });

      await tx.balanceTransaction.create({
        data: {
          userId: invite.studioId,
          type: BalanceTxType.REFUND,
          amountCents: INVITE_COST_CENTS,
          inviteId: invite.id,
          note: `Refund for declined invite ${invite.id}`
        }
      });

      await tx.studioBalance.update({
        where: { userId: invite.studioId },
        data: {
          holdUsd: { decrement: INVITE_COST_CENTS },
          availableUsd: { increment: INVITE_COST_CENTS }
        }
      });
    });
  }

  revalidatePath("/cabinet");
  redirect(`/cabinet?inviteResponse=${response}#invites`);
}

export async function reportInviteMismatchAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const inviteId = String(formData.get("inviteId") ?? "");
  const reason = cleanText(formData.get("reason"), 500);
  if (!inviteId) throw new Error("Invite ID missing");
  if (reason.length < 10) throw new Error("Опишите причину жалобы");

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new Error("Инвайт не найден");
  if (invite.modelId !== session.user.id) throw new Error("Нет доступа");
  if (invite.status !== InviteStatus.ACCEPTED) throw new Error("Жалоба возможна только на принятый инвайт");

  await prisma.$transaction([
    prisma.report.create({
      data: {
        targetType: "INVITE",
        targetId: inviteId,
        reason,
        reporterId: session.user.id
      }
    }),
    prisma.user.update({
      where: { id: invite.studioId },
      data: { violationCount: { increment: 1 } }
    })
  ]);

  revalidatePath("/cabinet");
  revalidatePath("/admin");
  redirect(`/cabinet?inviteReport=sent#invites`);
}

export async function topUpBalanceAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Недостаточно прав");

  const userId = String(formData.get("userId") ?? "");
  const amountCents = cleanNumber(formData.get("amountCents"), 1, 10000000);
  const note = cleanText(formData.get("note"), 500) || "Admin top-up";

  if (!userId) throw new Error("User ID missing");

  await prisma.$transaction([
    prisma.studioBalance.upsert({
      where: { userId },
      update: { availableUsd: { increment: amountCents } },
      create: { userId, availableUsd: amountCents }
    }),
    prisma.balanceTransaction.create({
      data: {
        userId,
        type: BalanceTxType.TOP_UP,
        amountCents,
        note
      }
    })
  ]);

  revalidatePath("/admin");
  revalidatePath("/cabinet");
}
