"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AccountMode, BalanceTxType, ContentStatus, InviteStatus, ListingType, PaymentStatus, PaymentType, Prisma, ProductCondition, ProductDelivery, ProfileKind, UserRole } from "@prisma/client";
import { auth, signIn, signOut } from "@/auth";
import { getExpertLicenseEnd, getResumeUnlockEnd } from "@/lib/licenses";
import { adRevalidatePaths, isHttpUrl, normalizeAdPlacement } from "@/lib/ads";
import { normalizeArticleBody, stripArticleHtml } from "@/lib/article-html";
import { prisma } from "@/lib/prisma";
import { listingExpiresAt, matchProfileExpiresAt, productExpiresAt, resumeExpiresAt } from "@/lib/publication-periods";
import { isUserBlocked, requireRole } from "@/lib/access";
import { safeInternalPath } from "@/lib/safe-redirect";
import { articleSeoPath } from "@/lib/seo-url";
import { articleTopic } from "@/lib/topics";
import { isUploadedFile, saveUploadedImage } from "@/lib/uploaded-image";
import { cleanMultiline, cleanNumber, cleanText, makeSlug, optionalUrl, requireMultiline, requireText } from "@/lib/validation";
import { sendEmail, verificationEmail, passwordResetEmail, inviteReceivedEmail, inviteAcceptedEmail, inviteDeclinedEmail, contactsExchangedModelEmail, balanceTopUpEmail } from "@/lib/email";

function ensureAdult(formData: FormData) {
  if (formData.get("adult") !== "on") throw new Error("Нужно подтвердить 18+");
}

async function logAudit(userId: string, action: string, targetType: string, targetId: string, details?: string) {
  await prisma.auditLog.create({ data: { userId, action, targetType, targetId, details } });
}

async function createEmailVerificationToken(email: string) {
  const token = crypto.randomUUID();
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
  return token;
}

async function sendVerificationEmail(email: string, name?: string | null) {
  const token = await createEmailVerificationToken(email);
  const vEmail = verificationEmail(name || "", token);
  await sendEmail(email, vEmail.subject, vEmail.html);
}

async function requireVerifiedEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true }
  });
  if (!user?.emailVerified) redirect("/cabinet?verifyRequired=1");
}

async function requireActiveSessionUser() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, blockedPermanently: true, blockedUntil: true }
  });
  if (!user) redirect("/auth/signin");
  if (isUserBlocked(user)) throw new Error("Ваш аккаунт заблокирован. Действие недоступно.");

  return session.user;
}

const passwordResetIdentifier = (email: string) => `password-reset:${email}`;

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

  await sendVerificationEmail(email, name);

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

export async function resendVerificationEmailAction() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, emailVerified: true }
  });
  if (!user?.email) redirect("/cabinet?verifyRequired=1");
  if (!user.emailVerified) {
    await sendVerificationEmail(user.email, user.name);
  }

  redirect("/cabinet?verifySent=1");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = cleanText(formData.get("email"), 255).toLowerCase();
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { email: true, name: true, passwordHash: true } });
    if (user?.email && user.passwordHash) {
      const token = crypto.randomUUID();
      const identifier = passwordResetIdentifier(user.email);
      await prisma.verificationToken.deleteMany({ where: { identifier } });
      await prisma.verificationToken.create({
        data: {
          identifier,
          token,
          expires: new Date(Date.now() + 30 * 60 * 1000)
        }
      });
      const emailContent = passwordResetEmail(user.name || "", token);
      await sendEmail(user.email, emailContent.subject, emailContent.html);
    }
  }

  redirect("/auth/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = cleanText(formData.get("token"), 120);
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!token) redirect("/auth/reset-password?error=token");
  if (password.length < 6 || password !== passwordConfirm) redirect(`/auth/reset-password?token=${encodeURIComponent(token)}&error=password`);

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || !record.identifier.startsWith("password-reset:")) redirect("/auth/reset-password?error=token");
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
    redirect("/auth/reset-password?error=expired");
  }

  const email = record.identifier.replace("password-reset:", "");
  await prisma.user.update({
    where: { email },
    data: { passwordHash: await hash(password, 10) }
  });
  await prisma.verificationToken.delete({ where: { token } }).catch(() => null);

  redirect("/auth/signin?passwordReset=1");
}

export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (password.length < 6 || password !== passwordConfirm) redirect("/cabinet?passwordError=invalid");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user?.passwordHash) redirect("/cabinet?passwordError=invalid");

  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) redirect("/cabinet?passwordError=current");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await hash(password, 10) }
  });

  redirect("/cabinet?passwordUpdated=1");
}

export async function updateEmailAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const email = cleanText(formData.get("email"), 255).toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  if (!email) redirect("/cabinet?emailError=invalid");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, passwordHash: true }
  });
  if (!user?.passwordHash) redirect("/cabinet?emailError=invalid");

  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) redirect("/cabinet?emailError=current");

  if (user.email === email) redirect("/cabinet?emailUpdated=same");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing && existing.id !== user.id) redirect("/cabinet?emailError=exists");

  await prisma.user.update({
    where: { id: user.id },
    data: { email, emailVerified: null }
  });
  await sendVerificationEmail(email, user.name);

  redirect("/cabinet?emailUpdated=1");
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
  const title = String(formData.get("title") ?? "");
  return await saveUploadedImage(formData.get("coverFile"), title || undefined) ?? optionalUrl(formData.get("coverImage"));
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
    if (forbiddenModelVacancyPattern.test(vacancyRole)) throw new Error("Вакансии для моделей здесь нельзя размещать. Используйте резюме моделей и другие разделы.");

    const schedule = cleanText(formData.get("schedule"), 240);
    const shiftScheme = cleanText(formData.get("shiftScheme"), 80);
    const shiftLength = cleanText(formData.get("shiftLength"), 40);
    const workTime = cleanText(formData.get("workTime"), 200);
    const weekends = cleanText(formData.get("weekends"), 80);
    const training = cleanText(formData.get("training"), 120);
    const provided = cleanText(formData.get("provided"), 300);
    const bonuses = cleanText(formData.get("bonuses"), 500);
    const careerGrowth = cleanText(formData.get("careerGrowth"), 120);
    const penaltySystem = cleanText(formData.get("penaltySystem"), 120);
    const additionalConditions = cleanMultiline(formData.get("additionalConditions"), 1200);
    const expReq = cleanText(formData.get("expReq"), 80);
    const expReqImp = cleanText(formData.get("expReqImportance"), 20);
    const langReq = cleanText(formData.get("langReq"), 200);
    const langReqImp = cleanText(formData.get("langReqImportance"), 20);
    const genderReq = cleanText(formData.get("genderReq"), 40);
    const ageReq = cleanText(formData.get("ageReq"), 40);
    const eduReq = cleanText(formData.get("eduReq"), 40);
    const keySkills = cleanMultiline(formData.get("keySkills"), 1000);
    const contactPerson = cleanText(formData.get("contactPerson"), 120);
    const website = cleanText(formData.get("website"), 300);
    const companyName = cleanText(formData.get("companyName"), 120);
    const employerType = cleanText(formData.get("employerType"), 80);
    const district = cleanText(formData.get("district"), 200);

    const impLabel = (v: string) => v === "must" ? "(обязательно)" : v === "nice" ? "(желательно)" : "";

    const scheduleStr = schedule || [shiftScheme, shiftLength, workTime, weekends].filter(Boolean).join("; ");
    const requirementsStr = [
      expReq ? `Опыт: ${expReq} ${impLabel(expReqImp)}` : null,
      langReq ? `Языки: ${langReq} ${impLabel(langReqImp)}` : null,
      genderReq && genderReq !== "Не важно" ? `Пол: ${genderReq}` : null,
      ageReq && ageReq !== "Не важно" ? `Возраст: ${ageReq}` : null,
      eduReq && eduReq !== "Не важно" ? `Образование: ${eduReq}` : null,
      keySkills ? `Навыки: ${keySkills}` : null
    ].filter(Boolean).join("\n");
    const conditionsStr = [
      training ? `Обучение: ${training}` : null,
      provided ? `Предоставляется: ${provided}` : null,
      bonuses ? `Бонусы: ${bonuses}` : null,
      careerGrowth ? `Карьерный рост: ${careerGrowth}` : null,
      penaltySystem ? `Штрафы: ${penaltySystem}` : null,
      additionalConditions
    ].filter(Boolean).join("\n");

    return [
      structuredLine("Роль", vacancyRole),
      structuredLine("Работодатель", employerType),
      structuredLine("Компания", companyName),
      structuredLine("Оплата", price),
      structuredLine("Комментарий к оплате", priceComment),
      structuredLine("График", scheduleStr),
      structuredLine("Занятость", cleanText(formData.get("workload"), 120)),
      structuredLine("Район", district),
      structuredLine("Требования", requirementsStr),
      structuredLine("Условия", conditionsStr),
      structuredLine("Дополнительные условия", cleanText(formData.get("benefitsOther"), 240)),
      structuredLine("Контактное лицо", contactPerson),
      structuredLine("Сайт", website),
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
    const minOrder = cleanText(formData.get("minOrder"), 200);
    const freeConsultation = cleanText(formData.get("freeConsultation"), 120);
    const discounts = cleanText(formData.get("discounts"), 300);
    const providerType = cleanText(formData.get("providerType"), 120);
    const providerExp = cleanText(formData.get("providerExp"), 120);
    const portfolio = cleanText(formData.get("portfolio"), 300);
    const aboutProvider = cleanMultiline(formData.get("aboutProvider"), 1200);
    const contactPerson = cleanText(formData.get("contactPerson"), 120);
    const website = cleanText(formData.get("website"), 300);

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
      structuredLine("Предоплата", prepay),
      structuredLine("Мин. объём заказа", minOrder),
      structuredLine("Бесплатная консультация", freeConsultation),
      structuredLine("Скидки", discounts),
      structuredLine("Тип исполнителя", providerType),
      structuredLine("Опыт", providerExp),
      structuredLine("Портфолио", portfolio),
      structuredLine("Об исполнителе", aboutProvider),
      structuredLine("Контактное лицо", contactPerson),
      structuredLine("Сайт", website),
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
  const sessionUser = await requireActiveSessionUser();

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      accountMode: normalizeAccountMode(String(formData.get("accountMode") ?? "CONSUMER")),
      profileKind: normalizeProfileKind(String(formData.get("profileKind") ?? "MODEL"))
    }
  });

  revalidatePath("/cabinet");
  redirect("/cabinet?updated=profile");
}

export async function updatePublicProfileAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  let avatarUrl: string | null = null;
  try {
    avatarUrl = await saveUploadedImage(formData.get("avatarFile"), `avatar-${sessionUser.id}`);
  } catch (err) {
    console.error("Avatar upload failed:", err instanceof Error ? err.message : err);
  }

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      name: requireText(formData.get("name"), "имя", 120),
      ...(avatarUrl ? { image: avatarUrl } : {}),
      profileBio: cleanMultiline(formData.get("profileBio"), 1200) || null
    }
  });

  revalidatePath("/cabinet");
  revalidatePath("/authors");
  revalidatePath(`/profiles/${sessionUser.id}`);
  revalidatePath("/articles");
  redirect("/cabinet?updated=publicProfile");
}

export async function addArticleCommentAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const articleId = String(formData.get("articleId") ?? "");
  const parentId = cleanText(formData.get("parentId"), 120) || null;
  const body = cleanText(formData.get("body"), 1200);
  if (!articleId || body.length < 2) throw new Error("Комментарий слишком короткий");

  const article = await prisma.article.findUnique({ where: { id: articleId }, select: { id: true, title: true } });
  if (!article) throw new Error("Материал не найден");

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { emailVerified: true } });
  if (!user?.emailVerified) {
    redirect(`${articleSeoPath(article)}?commentError=verifyRequired#comments`);
  }

  await prisma.articleComment.create({
    data: { articleId, parentId, userId: sessionUser.id, body }
  });

  await revalidateArticle(articleId);
}

export async function likeCommentAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const commentId = String(formData.get("commentId") ?? "");
  if (!commentId) throw new Error("Comment ID missing");
  const comment = await prisma.articleComment.findUnique({ where: { id: commentId }, select: { articleId: true } });
  if (!comment) throw new Error("Комментарий не найден");

  await prisma.commentLike.upsert({
    where: { commentId_userId: { commentId, userId: sessionUser.id } },
    update: {},
    create: { commentId, userId: sessionUser.id }
  });

  await revalidateArticle(comment.articleId);
}

export async function rateArticleAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const articleId = String(formData.get("articleId") ?? "");
  const value = Number(formData.get("value") ?? 0);
  if (!articleId || value < 1 || value > 5) throw new Error("Оценка должна быть от 1 до 5");

  await prisma.articleRating.upsert({
    where: { articleId_userId: { articleId, userId: sessionUser.id } },
    update: { value },
    create: { articleId, userId: sessionUser.id, value }
  });

  await revalidateArticle(articleId);
}


export async function repostArticleAction(formData: FormData) {
  await requireActiveSessionUser();

  const articleId = String(formData.get("articleId") ?? "");
  if (!articleId) throw new Error("Article ID missing");

  await prisma.article.update({
    where: { id: articleId },
    data: { repostCount: { increment: 1 } }
  });

  await revalidateArticle(articleId);
}

export async function respondToArticleAction(formData: FormData) {
  await requireActiveSessionUser();

  const articleId = String(formData.get("articleId") ?? "");
  if (!articleId) throw new Error("Article ID missing");

  await prisma.article.update({
    where: { id: articleId },
    data: { responseCount: { increment: 1 } }
  });

  await revalidateArticle(articleId);
}

export async function respondToListingAction(formData: FormData) {
  await requireActiveSessionUser();

  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) throw new Error("Listing ID missing");

  await prisma.listing.update({
    where: { id: listingId },
    data: { responseCount: { increment: 1 } }
  });

  await revalidateListing(listingId);
}

export async function respondToProductAction(formData: FormData) {
  await requireActiveSessionUser();

  const productId = String(formData.get("productId") ?? "");
  if (!productId) throw new Error("Product ID missing");

  await prisma.product.update({
    where: { id: productId },
    data: { responseCount: { increment: 1 } }
  });

  await revalidateProduct(productId);
}

export async function respondToResumeAction(formData: FormData) {
  await requireActiveSessionUser();

  const resumeId = String(formData.get("resumeId") ?? "");
  if (!resumeId) throw new Error("Resume ID missing");

  await prisma.resume.update({
    where: { id: resumeId },
    data: { responseCount: { increment: 1 } }
  });

  revalidatePath("/resumes");
}

async function requirePaidUser() {
  const sessionUser = await requireActiveSessionUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, role: true, accountMode: true, emailVerified: true, blockedPermanently: true, blockedUntil: true }
  });

  if (!user) redirect("/auth/signin");
  if (isUserBlocked(user)) throw new Error("Ваш аккаунт заблокирован. Действие недоступно.");
  if (!user.emailVerified) redirect("/cabinet?verifyRequired=1");
  if (!canProvide(user.accountMode) && user.role !== "ADMIN") throw new Error("Включите режим поставщика услуг");
  return user;
}

export async function submitBlogArticleAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const title = requireText(formData.get("title"), "заголовок", 140);
  const summary = requireText(formData.get("summary"), "краткое описание", 260);
  const body = requireArticleBody(formData.get("body"));
  const format = normalizeArticleFormat(formData.get("format"));
  const topic = requireArticleTopic(formData.get("topic"));
  const coverImage = await resolveCoverImage(formData);
  const articleId = cleanText(formData.get("draftId"), 120);

  const slug = makeSlug(title);

  if (articleId) {
    const existing = await prisma.article.findFirst({ where: { id: articleId, createdById: sessionUser.id } });
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
      createdById: sessionUser.id
    }
  });

  revalidatePath("/articles");
  revalidatePath("/cabinet");
  redirect(`/cabinet?created=article&articleId=${encodeURIComponent(article.id)}#article-result`);
}

export async function saveBlogDraftAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const title = cleanText(formData.get("title"), 140) || "Черновик без заголовка";
  const summary = cleanText(formData.get("summary"), 260) || "Короткое описание появится здесь.";
  const body = cleanArticleDraftBody(formData.get("body"));
  const draftId = cleanText(formData.get("draftId"), 120);
  const format = normalizeArticleFormat(formData.get("format"));
  const topic = normalizeTopic(formData.get("topic"), title, body);
  const coverImage = await resolveCoverImage(formData);

  if (draftId) {
    const existing = await prisma.article.findFirst({ where: { id: draftId, createdById: sessionUser.id } });
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
      createdById: sessionUser.id
    }
  });

  revalidatePath("/cabinet");
  redirect("/cabinet?updated=draft");
}

export async function updateBlogArticleAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const articleId = cleanText(formData.get("draftId"), 120);
  const existing = await prisma.article.findFirst({ where: { id: articleId, createdById: sessionUser.id } });
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
  const sessionUser = await requireActiveSessionUser();

  const articleId = cleanText(formData.get("articleId"), 120);
  const article = await prisma.article.findFirst({ where: { id: articleId, createdById: sessionUser.id } });
  if (!article) throw new Error("Статья не найдена");
  if (article.status !== ContentStatus.PUBLISHED) await requireVerifiedEmail(sessionUser.id);

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
  const sessionUser = await requireActiveSessionUser();

  const articleId = cleanText(formData.get("articleId"), 120);
  const article = await prisma.article.findFirst({ where: { id: articleId, createdById: sessionUser.id } });
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
  const sessionUser = await requireActiveSessionUser();

  const listingId = cleanText(formData.get("listingId"), 120);
  const employmentType = String(formData.get("employmentType") ?? "REMOTE");
  const listing = await prisma.listing.findFirst({ where: { id: listingId, createdById: sessionUser.id } });
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
  const sessionUser = await requireActiveSessionUser();

  const listingId = cleanText(formData.get("listingId"), 120);
  const listing = await prisma.listing.findFirst({ where: { id: listingId, createdById: sessionUser.id } });
  if (!listing) throw new Error("Размещение не найдено");
  if (listing.status !== ContentStatus.PUBLISHED) await requireVerifiedEmail(sessionUser.id);

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
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const listingId = cleanText(formData.get("listingId"), 120);
  const listing = await prisma.listing.findFirst({ where: { id: listingId, createdById: sessionUser.id } });
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
  const sessionUser = await requireActiveSessionUser();

  const listingId = cleanText(formData.get("listingId"), 120);
  const listing = await prisma.listing.findFirst({ where: { id: listingId, createdById: sessionUser.id } });
  if (!listing) throw new Error("Размещение не найдено");

  await prisma.listing.delete({ where: { id: listing.id } });

  revalidatePath(listing.type === ListingType.VACANCY ? "/vacancies" : "/services");
  revalidatePath("/listings");
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=listing#materials");
}

export async function submitProductAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  let productId = "";
  try {
    const title = requireText(formData.get("title"), "название товара", 140);
    const productImages = formData.getAll("productImages").map(String).filter(Boolean).slice(0, 3);
    const legacyImage = await saveUploadedImage(formData.get("imageFile"), `tovar-${title}`) ?? await productImageDataUrl(formData.get("imageFile"));
    const images = productImages.length > 0 ? productImages : legacyImage ? [legacyImage] : [];
    const imageUrl = images[0] || null;
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
        createdById: sessionUser.id,
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
          images,
          status: ContentStatus.PUBLISHED,
          expiresAt: productExpiresAt(),
          createdById: sessionUser.id
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
  const sessionUser = await requireActiveSessionUser();

  const productId = cleanText(formData.get("productId"), 120);
  const product = await prisma.product.findFirst({ where: { id: productId, createdById: sessionUser.id } });
  if (!product) throw new Error("Товар не найден");

  const title = requireText(formData.get("title"), "название товара", 140);
  const productImages = formData.getAll("productImages").map(String).filter(Boolean).slice(0, 3);
  const legacyImage = await saveUploadedImage(formData.get("imageFile"), `tovar-${title}`) ?? await productImageDataUrl(formData.get("imageFile"));
  const images = productImages.length > 0 ? productImages : legacyImage ? [legacyImage] : product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const imageUrl = images[0] || product.imageUrl;
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
      imageUrl,
      images,
    }
  });

  await revalidateProduct(product.id);
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=product#materials");
}

export async function toggleProductVisibilityAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const productId = cleanText(formData.get("productId"), 120);
  const product = await prisma.product.findFirst({ where: { id: productId, createdById: sessionUser.id } });
  if (!product) throw new Error("Товар не найден");
  if (product.status !== ContentStatus.PUBLISHED) await requireVerifiedEmail(sessionUser.id);

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
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const productId = cleanText(formData.get("productId"), 120);
  const product = await prisma.product.findFirst({ where: { id: productId, createdById: sessionUser.id } });
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
  const sessionUser = await requireActiveSessionUser();

  const productId = cleanText(formData.get("productId"), 120);
  const product = await prisma.product.findFirst({ where: { id: productId, createdById: sessionUser.id } });
  if (!product) throw new Error("Товар не найден");

  await prisma.product.delete({ where: { id: product.id } });

  revalidatePath("/products");
  revalidatePath("/cabinet");
  redirect("/cabinet?updated=product#materials");
}

export async function followAuthorAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const authorId = String(formData.get("authorId") ?? "");
  const next = safeInternalPath(cleanText(formData.get("next"), 500), `/profiles/${authorId}`);
  if (!authorId || authorId === sessionUser.id) redirect(withStatusParam(next, "follow", "skipped"));

  const existing = await prisma.follow.findUnique({
    where: { followerId_authorId: { followerId: sessionUser.id, authorId } }
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
  } else {
    await prisma.follow.create({ data: { followerId: sessionUser.id, authorId } });
  }

  revalidatePath(`/profiles/${authorId}`);
  revalidatePath("/cabinet");
  revalidatePath("/articles");
  redirect(withStatusParam(next, "follow", existing ? "removed" : "added"));
}

export async function followTopicAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const topic = normalizeTopic(formData.get("topic"), "", "");
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/articles");
  const existing = await prisma.topicFollow.findUnique({
    where: { userId_topic: { userId: sessionUser.id, topic } }
  });

  if (existing) {
    await prisma.topicFollow.delete({ where: { id: existing.id } });
  } else {
    await prisma.topicFollow.create({ data: { userId: sessionUser.id, topic } });
  }

  revalidatePath("/articles");
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "topicFollow", existing ? "removed" : "added"));
}

export async function saveListingAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const listingId = String(formData.get("listingId") ?? "");
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/cabinet#materials");
  if (!listingId) throw new Error("Listing ID missing");
  const existing = await prisma.savedListing.findUnique({
    where: { userId_listingId: { userId: sessionUser.id, listingId } }
  });

  if (existing) {
    await prisma.savedListing.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedListing.create({
      data: { userId: sessionUser.id, listingId }
    });
  }

  await revalidateListing(listingId);
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "favorite", existing ? "removed" : "added"));
}

export async function saveProductAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const productId = String(formData.get("productId") ?? "");
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/cabinet#materials");
  if (!productId) throw new Error("Product ID missing");
  const existing = await prisma.savedProduct.findUnique({
    where: { userId_productId: { userId: sessionUser.id, productId } }
  });

  if (existing) {
    await prisma.savedProduct.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedProduct.create({ data: { userId: sessionUser.id, productId } });
  }

  await revalidateProduct(productId);
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "favorite", existing ? "removed" : "added"));
}

export async function saveResumeAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const resumeId = cleanText(formData.get("resumeId"), 120);
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/resumes");
  if (!resumeId) throw new Error("Resume ID missing");
  const existing = await prisma.savedResume.findUnique({
    where: { userId_resumeId: { userId: sessionUser.id, resumeId } }
  });

  if (existing) {
    await prisma.savedResume.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedResume.create({ data: { userId: sessionUser.id, resumeId } });
  }

  revalidatePath("/resumes");
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "favorite", existing ? "removed" : "added"));
}

export async function saveMatchProfileAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const matchProfileId = cleanText(formData.get("matchProfileId"), 120);
  const next = safeInternalPath(cleanText(formData.get("next"), 500), "/model-operator");
  if (!matchProfileId) throw new Error("Match profile ID missing");
  const existing = await prisma.savedMatchProfile.findUnique({
    where: { userId_matchProfileId: { userId: sessionUser.id, matchProfileId } }
  });

  if (existing) {
    await prisma.savedMatchProfile.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedMatchProfile.create({ data: { userId: sessionUser.id, matchProfileId } });
  }

  revalidatePath("/model-operator");
  revalidatePath("/cabinet");
  redirect(withStatusParam(next, "favorite", existing ? "removed" : "added"));
}

export async function addListingReviewAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const listingId = cleanText(formData.get("listingId"), 120);
  const parentId = cleanText(formData.get("parentId"), 120) || null;
  const body = requireMultiline(formData.get("body"), "отзыв", 1600);
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, type: true, createdById: true } });
  if (!listing || listing.type !== ListingType.SERVICE) throw new Error("Отзывы можно оставлять только на услуги");

  if (parentId) {
    if (listing.createdById !== sessionUser.id) throw new Error("Отвечать на отзыв может только автор услуги");
    const parent = await prisma.listingReview.findFirst({ where: { id: parentId, listingId: listing.id, parentId: null, isHidden: false } });
    if (!parent) throw new Error("Отзыв не найден");

    await prisma.listingReview.create({
      data: { listingId: listing.id, userId: sessionUser.id, parentId: parent.id, body, rating: null }
    });
  } else {
    if (listing.createdById === sessionUser.id) throw new Error("Нельзя оставлять отзыв на собственную услугу");
    const rating = Number(formData.get("rating") ?? 0);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Оценка должна быть от 1 до 5");

    await prisma.listingReview.create({
      data: { listingId: listing.id, userId: sessionUser.id, body, rating }
    });
  }

  await revalidateListing(listing.id);
  revalidatePath("/admin");
  redirect(`/listings/${listing.id}?review=added#reviews`);
}

export async function updateOwnListingReviewAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const reviewId = cleanText(formData.get("reviewId"), 120);
  const body = requireMultiline(formData.get("body"), "отзыв", 1600);
  const rating = Number(formData.get("rating") ?? 0);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Оценка должна быть от 1 до 5");

  const review = await prisma.listingReview.findFirst({
    where: { id: reviewId, userId: sessionUser.id, parentId: null, isHidden: false },
    include: { listing: { select: { id: true, type: true, createdById: true } } }
  });
  if (!review || review.listing.type !== ListingType.SERVICE) throw new Error("Отзыв не найден");
  if (review.listing.createdById === sessionUser.id) throw new Error("Нельзя редактировать отзыв на собственную услугу");

  await prisma.listingReview.update({ where: { id: review.id }, data: { body, rating } });

  await revalidateListing(review.listingId);
  revalidatePath("/admin");
  redirect(`/listings/${review.listingId}?review=updated#reviews`);
}

export async function deleteOwnListingReviewAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const reviewId = cleanText(formData.get("reviewId"), 120);
  const review = await prisma.listingReview.findFirst({
    where: { id: reviewId, userId: sessionUser.id, parentId: null, isHidden: false },
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
  await logAudit(session.user.id, "delete_review", "LISTING_REVIEW", reviewId);
  await revalidateListing(review.listingId);
  revalidatePath("/admin");
}

export type ReportContentState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function reportContentAction(_state: ReportContentState, formData: FormData): Promise<ReportContentState> {
  const sessionUser = await requireActiveSessionUser();

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
      reporterId: sessionUser.id
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

  await logAudit(session.user.id, decision === "hide" ? "hide_report" : "resolve_report", "REPORT", reportId);

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
  const positionOther = cleanText(formData.get("specPositionOther"), 120);
  const exp = cleanList(formData, "specExperience", 2);
  const searchStatus = cleanList(formData, "specSearchStatus", 2);
  const workFormat = cleanList(formData, "specWorkFormat", 4);
  const city = cleanText(formData.get("specCity"), 120);
  const relocation = cleanList(formData, "specRelocation", 2);
  const employment = cleanList(formData, "specEmployment", 4);
  const duties = cleanMultiline(formData.get("specDuties"), 2000);
  const shiftSchemes = cleanList(formData, "specShiftSchemes", 8);
  const shiftLength = cleanList(formData, "specShiftLength", 2);
  const shiftTime = cleanList(formData, "specShiftTime", 6);
  const weekends = cleanList(formData, "specWeekends", 2);
  const payFormat = cleanList(formData, "specPayFormat", 4);
  const salary = cleanText(formData.get("specSalary"), 120);
  const payFrequency = cleanList(formData, "specPayFrequency", 4);
  const payMethod = cleanList(formData, "specPayMethod", 6);
  const training = cleanList(formData, "specTraining", 2);
  const importantConditions = cleanList(formData, "specImportantConditions", 10);
  const careerGrowth = cleanList(formData, "specCareerGrowth", 2);
  const penalties = cleanList(formData, "specPenalties", 2);
  const additionalWishes = cleanMultiline(formData.get("specAdditionalWishes"), 1200);
  const langs = cleanList(formData, "specLanguages", 8);
  const keySkills = cleanMultiline(formData.get("specKeySkills"), 1000);
  const programs = cleanList(formData, "specPrograms", 12);
  const portfolio = cleanText(formData.get("specPortfolio"), 300);
  const aboutMe = cleanMultiline(formData.get("specAboutMe"), 1200);
  const socialLinks = cleanText(formData.get("specSocialLinks"), 300);
  const contactPerson = cleanText(formData.get("specContactPerson"), 120);
  const contactComm = cleanText(formData.get("specContactComm"), 180);
  const resumeLink = cleanText(formData.get("specResumeLink"), 300);

  const positionFinal = positionOther ? [...position.filter(p => p !== "Другое"), positionOther] : position;

  return [
    "О СПЕЦИАЛИСТЕ",
    listLine("Должность", positionFinal),
    listLine("Опыт", exp),
    listLine("Статус поиска", searchStatus),
    "",
    "О СЕБЕ",
    listLine("Формат работы", workFormat),
    `Город: ${city || "не указано"}`,
    listLine("Готовность к релокации", relocation),
    listLine("Занятость", employment),
    `Готовые обязанности: ${duties || "не указано"}`,
    "",
    "ГРАФИК",
    listLine("Схемы смен", shiftSchemes),
    listLine("Длительность смены", shiftLength),
    listLine("Приоритетные смены", shiftTime),
    listLine("Выходные", weekends),
    "",
    "ЗАРПЛАТА",
    listLine("Формат оплаты", payFormat),
    `Ожидаемая зарплата: ${salary || "не указано"}`,
    listLine("Периодичность", payFrequency),
    listLine("Способ выплаты", payMethod),
    "",
    "УСЛОВИЯ",
    listLine("Обучение", training),
    listLine("Что важно", importantConditions),
    listLine("Карьерный рост", careerGrowth),
    listLine("Штрафы", penalties),
    `Доп. пожелания: ${additionalWishes || "не указано"}`,
    "",
    "НАВЫКИ",
    listLine("Языки", langs),
    `Ключевые навыки: ${keySkills || "не указано"}`,
    listLine("Программы и сервисы", programs),
    `Портфолио: ${portfolio || "не указано"}`,
    "",
    "КОНТАКТЫ",
    `О себе: ${aboutMe || "не указано"}`,
    `Соцсети: ${socialLinks || "не указано"}`,
    `Контактное лицо: ${contactPerson || "не указано"}`,
    `Контакт для связи: ${contactComm || "не указано"}`,
    `Резюме: ${resumeLink || "не указано"}`
  ].join("\n").slice(0, 6000);
}

function buildModelResumeQuizBio(formData: FormData) {
  if (formData.get("resumeConfirm") !== "on") throw new Error("Нужно подтвердить актуальность требований");

  const gender = cleanList(formData, "gender", 2);
  const age = cleanText(formData.get("age"), 10);
  const workFormat = cleanList(formData, "workFormatModel", 2);
  const citizenship = cleanList(formData, "citizenship", 2);
  const categories = cleanList(formData, "categories", 16);
  const experience = cleanList(formData, "modelExperience", 2);
  const status = cleanList(formData, "modelSearchStatus", 2);
  const sites = cleanList(formData, "sites", 12);
  const appearance = cleanList(formData, "appearance", 2);
  const incomePerShift = cleanList(formData, "incomePerShift", 3);
  const payoutFrequency = cleanList(formData, "payoutFrequency", 4);
  const payMethod = cleanList(formData, "payMethod", 6);
  const penalties = cleanList(formData, "penalties", 3);
  const equipment = cleanList(formData, "equipment", 12);
  const shiftTime = cleanList(formData, "shiftTime", 6);
  const amenities = cleanList(formData, "amenities", 8);
  const teamComfort = cleanList(formData, "teamComfort", 4);
  const adminGender = cleanList(formData, "adminGender", 4);
  const rooms = cleanMultiline(formData.get("rooms"), 600);
  const wishesText = cleanMultiline(formData.get("wishesText"), 1200);
  const location = cleanText(formData.get("city"), 120);

  return [
    "О МОДЕЛИ",
    listLine("Пол", gender),
    `Возраст: ${age || "не указано"}`,
    listLine("Формат работы", workFormat),
    `Город: ${location || "не указано"}`,
    listLine("Гражданство", citizenship),
    "",
    "О РАБОТЕ",
    listLine("Форматы работы", categories),
    listLine("Опыт", experience),
    listLine("Статус поиска", status),
    "",
    "НАВЫКИ",
    listLine("Площадки", sites),
    listLine("Внешность", appearance),
    "",
    "НАГРУЗКА",
    textLine("Смен в неделю", formData.get("shiftsPerWeek")),
    textLine("Длительность смены", formData.get("shiftLength")),
    listLine("Средний доход за смену", incomePerShift),
    "",
    "ДЕНЬГИ",
    textLineWithImportance(formData, "Минимальный процент", formData.get("minimumPercent"), "minimumPercent"),
    listLine("Периодичность выплат", payoutFrequency),
    listLine("Способ выплаты", payMethod),
    listLine("Штрафы и удержания", penalties),
    "",
    "УСЛОВИЯ",
    `Комнаты: ${rooms || "не указано"}`,
    listLine("Оборудование", equipment),
    listLine("Приоритетные смены", shiftTime),
    listLine("Удобства", amenities),
    "",
    "КОМАНДА",
    listLine("Комфортная среда", teamComfort),
    listLine("Пол админов/коучей", adminGender),
    "",
    "ПОЖЕЛАНИЯ",
    `${wishesText || "не указано"}`
  ].join("\n").slice(0, 6000);
}

export async function createResumeAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const title = requireText(formData.get("title"), "заголовок резюме", 140);
  const roleGoal = requireText(formData.get("roleGoal"), "желаемая роль", 120);
  const resumeTemplate = cleanText(formData.get("resumeTemplate"), 80);
  const bio =
    resumeTemplate === "model-quiz-v3" || resumeTemplate === "model-quiz-v2"
      ? buildModelResumeQuizBio(formData)
      : resumeTemplate === "specialist-quiz-v2" || resumeTemplate === "specialist-quiz-v1"
      ? buildSpecialistResumeQuizBio(formData)
      : resumeTemplate === "model-v1"
      ? buildModelResumeBio(formData)
      : requireMultiline(formData.get("bio"), "о себе", 6000);

  const resume = await prisma.resume.upsert({
    where: { userId: sessionUser.id },
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
      userId: sessionUser.id,
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
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const resume = await prisma.resume.findUnique({ where: { userId: sessionUser.id } });
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
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
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
  const sessionUser = await requireActiveSessionUser();
  await requireVerifiedEmail(sessionUser.id);

  const profile = await prisma.matchProfile.findUnique({ where: { userId: sessionUser.id } });
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
  await requireActiveSessionUser();

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

  await logAudit(session.user.id, decision === "approve" ? "approve_payment" : "reject_payment", "PAYMENT", paymentId, JSON.stringify({ decision }));

  revalidatePath("/admin");
  revalidatePath("/cabinet");
  revalidatePath("/resumes");
}

// ─── Invite system ───────────────────────────────────────────────────

const INVITE_COST_MODEL_CENTS = 1500; // $15 for model resumes
const INVITE_COST_SPECIALIST_CENTS = 500; // $5 for specialist resumes
const INVITE_DAILY_LIMIT = 10;
const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function inviteCostCents(roleGoal: string) {
  const lower = roleGoal.toLowerCase();
  if (lower === "модель" || lower.includes("модель")) return INVITE_COST_MODEL_CENTS;
  return INVITE_COST_SPECIALIST_CENTS;
}

export async function sendInviteAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
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
    select: { id: true, userId: true, roleGoal: true }
  });
  if (!resume) throw new Error("Резюме не найдено");
  if (resume.userId === user.id) throw new Error("Нельзя отправить инвайт самому себе");

  const costCents = inviteCostCents(resume.roleGoal);
  const balance = await prisma.studioBalance.findUnique({ where: { userId: user.id } });
  if (!balance || balance.availableUsd < costCents) throw new Error("Недостаточно средств на балансе");

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
        amountUsd: costCents,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS)
      }
    });

    const holdTx = await tx.balanceTransaction.create({
      data: {
        userId: user.id,
        type: BalanceTxType.HOLD,
        amountCents: costCents,
        inviteId: invite.id,
        note: `Hold for invite ${invite.id}`
      }
    });

    await tx.invite.update({ where: { id: invite.id }, data: { holdTxId: holdTx.id } });

    await tx.studioBalance.update({
      where: { userId: user.id },
      data: {
        availableUsd: { decrement: costCents },
        holdUsd: { increment: costCents }
      }
    });

    await tx.resume.update({
      where: { id: resumeId },
      data: { responseCount: { increment: 1 } }
    });
  });

  // Email notification to model
  const modelUser = await prisma.user.findUnique({ where: { id: resume.userId }, select: { email: true } });
  if (modelUser?.email) {
    const resumeFull = await prisma.resume.findUnique({ where: { id: resumeId }, select: { title: true } });
    const { subject, html } = inviteReceivedEmail(resumeFull?.title ?? "Резюме", message, offeredPercent);
    sendEmail(modelUser.email, subject, html);
  }

  revalidatePath("/resumes");
  revalidatePath("/cabinet");
  redirect(`/cabinet?invited=1#invites-sent`);
}

export async function respondInviteAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const inviteId = String(formData.get("inviteId") ?? "");
  const response = String(formData.get("response") ?? "");
  const declineReason = String(formData.get("declineReason") ?? "").trim();
  if (!inviteId || !["accept", "decline"].includes(response)) throw new Error("Некорректный ответ");
  if (response === "decline" && declineReason.length < 5) throw new Error("Укажите причину отклонения (минимум 5 символов)");

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new Error("Инвайт не найден");
  if (invite.modelId !== sessionUser.id) throw new Error("Нет доступа");
  if (invite.status !== InviteStatus.PENDING) throw new Error("Инвайт уже обработан");

  const cost = invite.amountUsd;

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
          amountCents: cost,
          inviteId: invite.id,
          note: `Charge for accepted invite ${invite.id}`
        }
      });

      await tx.studioBalance.update({
        where: { userId: invite.studioId },
        data: { holdUsd: { decrement: cost } }
      });
    });

    // Email to studio: contact received
    const studioUser = await prisma.user.findUnique({ where: { id: invite.studioId }, select: { email: true, name: true, tgHandle: true } });
    const modelResume = await prisma.resume.findUnique({ where: { id: invite.resumeId }, select: { title: true, contactEmail: true, contactTelegram: true } });
    if (studioUser?.email && modelResume) {
      const contact = [modelResume.contactTelegram, modelResume.contactEmail].filter(Boolean).join(" • ");
      const ea = inviteAcceptedEmail(modelResume.title, contact || "Контакт в кабинете");
      sendEmail(studioUser.email, ea.subject, ea.html);
    }

    // Email to model: studio contacts
    const modelUser = await prisma.user.findUnique({ where: { id: invite.modelId }, select: { email: true } });
    if (modelUser?.email && studioUser) {
      const studioContact = studioUser.tgHandle || studioUser.email || "Контакт в кабинете";
      const em = contactsExchangedModelEmail(studioUser.name || "Студия", studioContact);
      sendEmail(modelUser.email, em.subject, em.html);
    }
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.DECLINED, respondedAt: new Date(), declineReason }
      });

      await tx.balanceTransaction.create({
        data: {
          userId: invite.studioId,
          type: BalanceTxType.REFUND,
          amountCents: cost,
          inviteId: invite.id,
          note: `Refund for declined invite ${invite.id}`
        }
      });

      await tx.studioBalance.update({
        where: { userId: invite.studioId },
        data: {
          holdUsd: { decrement: cost },
          availableUsd: { increment: cost }
        }
      });
    });

    // Email to studio: invite declined
    const decStudioUser = await prisma.user.findUnique({ where: { id: invite.studioId }, select: { email: true } });
    const decResume = await prisma.resume.findUnique({ where: { id: invite.resumeId }, select: { title: true } });
    if (decStudioUser?.email && decResume) {
      const ed = inviteDeclinedEmail(decResume.title, declineReason);
      sendEmail(decStudioUser.email, ed.subject, ed.html);
    }
  }

  revalidatePath("/cabinet");
  redirect(`/cabinet?inviteResponse=${response}#invites`);
}

export async function reportInviteMismatchAction(formData: FormData) {
  const sessionUser = await requireActiveSessionUser();

  const inviteId = String(formData.get("inviteId") ?? "");
  const reason = cleanText(formData.get("reason"), 500);
  if (!inviteId) throw new Error("Invite ID missing");
  if (reason.length < 10) throw new Error("Опишите причину жалобы");

  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new Error("Инвайт не найден");
  if (invite.modelId !== sessionUser.id) throw new Error("Нет доступа");
  if (invite.status !== InviteStatus.ACCEPTED) throw new Error("Жалоба возможна только на принятый инвайт");

  await prisma.$transaction([
    prisma.report.create({
      data: {
        targetType: "INVITE",
        targetId: inviteId,
        reason,
        reporterId: sessionUser.id
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
  const rawDollars = formData.get("amountDollars");
  const amountCents = rawDollars ? cleanNumber(rawDollars, 1, 100000) * 100 : cleanNumber(formData.get("amountCents"), 1, 10000000);
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

  await logAudit(session.user.id, "top_up_balance", "USER", userId, JSON.stringify({ amountCents, note }));

  // Email notification
  const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (targetUser?.email) {
    const bt = balanceTopUpEmail(amountCents);
    sendEmail(targetUser.email, bt.subject, bt.html);
  }

  revalidatePath("/admin");
  revalidatePath("/cabinet");
}

function parseAdDate(value: FormDataEntryValue | null) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error("Некорректная дата рекламы");
  return date;
}

function revalidateAdPlacement(placement?: string) {
  for (const path of adRevalidatePaths(placement)) {
    revalidatePath(path);
  }
}

export async function createAdvertisementAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Недостаточно прав");

  const title = requireText(formData.get("title"), "название рекламы", 120);
  const imageUrl = requireText(formData.get("imageUrl"), "ссылку на картинку", 500);
  const targetUrl = requireText(formData.get("targetUrl"), "ссылку перехода", 500);
  if (!isHttpUrl(imageUrl)) throw new Error("Картинка должна быть http/https ссылкой");
  if (!isHttpUrl(targetUrl)) throw new Error("Ссылка перехода должна быть http/https ссылкой");

  const placement = normalizeAdPlacement(cleanText(formData.get("placement"), 80));
  await prisma.advertisement.create({
    data: {
      title,
      description: cleanText(formData.get("description"), 220) || null,
      imageUrl,
      targetUrl,
      placement,
      startsAt: parseAdDate(formData.get("startsAt")),
      expiresAt: parseAdDate(formData.get("expiresAt")),
      createdById: session.user.id
    }
  });

  revalidateAdPlacement(placement);
  redirect("/admin?ad=created#ads");
}

export async function updateAdvertisementAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Недостаточно прав");

  const adId = cleanText(formData.get("adId"), 120);
  const title = requireText(formData.get("title"), "название рекламы", 120);
  const imageUrl = requireText(formData.get("imageUrl"), "ссылку на картинку", 2000);
  const targetUrl = requireText(formData.get("targetUrl"), "ссылку перехода", 500);
  if (!isHttpUrl(imageUrl) && !imageUrl.startsWith("data:image/")) throw new Error("Картинка должна быть http/https ссылкой или data:image");
  if (!isHttpUrl(targetUrl)) throw new Error("Ссылка перехода должна быть http/https ссылкой");

  const placement = normalizeAdPlacement(cleanText(formData.get("placement"), 80));
  const previousAd = await prisma.advertisement.findUnique({ where: { id: adId }, select: { placement: true } });
  await prisma.advertisement.update({
    where: { id: adId },
    data: {
      title,
      description: cleanText(formData.get("description"), 220) || null,
      imageUrl,
      targetUrl,
      placement,
      startsAt: parseAdDate(formData.get("startsAt")),
      expiresAt: parseAdDate(formData.get("expiresAt"))
    }
  });

  revalidateAdPlacement(previousAd?.placement);
  revalidateAdPlacement(placement);
  redirect("/admin?ad=updated#ads");
}

export async function toggleAdvertisementAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Недостаточно прав");

  const adId = cleanText(formData.get("adId"), 120);
  const status = cleanText(formData.get("status"), 40);
  const nextStatus = status === "ARCHIVED" ? "ARCHIVED" : status === "PAUSED" ? "PAUSED" : "ACTIVE";
  const ad = await prisma.advertisement.update({
    where: { id: adId },
    data: { status: nextStatus as never },
    select: { placement: true }
  });

  revalidateAdPlacement(ad.placement);
  redirect("/admin?ad=updated#ads");
}

// ─── Admin system actions ────────────────────────────────────────────

export async function blockUserAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const targetUserId = String(formData.get("userId") ?? "");
  const blockType = String(formData.get("blockType") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const days = parseInt(String(formData.get("days") ?? "0"), 10);

  if (!targetUserId) throw new Error("User ID missing");
  if (!reason) throw new Error("Укажите причину блокировки");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new Error("Пользователь не найден");
  if (target.role === "ADMIN") throw new Error("Нельзя заблокировать администратора");

  if (blockType === "permanent" || days <= 0) {
    await prisma.user.update({
      where: { id: targetUserId },
      data: { blockedPermanently: true, blockedUntil: null, blockReason: reason }
    });
  } else {
    const until = new Date();
    until.setDate(until.getDate() + (days || 7));
    await prisma.user.update({
      where: { id: targetUserId },
      data: { blockedPermanently: false, blockedUntil: until, blockReason: reason }
    });
  }

  await logAudit(admin.id, "block_user", "USER", targetUserId, JSON.stringify({ blockType, days, reason }));
  revalidatePath("/admin");
  redirect("/admin/users");
}

export async function unblockUserAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId) throw new Error("User ID missing");

  await prisma.user.update({
    where: { id: targetUserId },
    data: { blockedPermanently: false, blockedUntil: null, blockReason: null }
  });

  await logAudit(admin.id, "unblock_user", "USER", targetUserId);
  revalidatePath("/admin");
  redirect("/admin/users");
}

export async function changeUserRoleAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const targetUserId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("role") ?? formData.get("newRole") ?? "") as UserRole;
  if (!targetUserId || !["USER", "ADMIN", "MODERATOR"].includes(newRole)) throw new Error("Invalid data");

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new Error("Пользователь не найден");

  await prisma.user.update({ where: { id: targetUserId }, data: { role: newRole } });
  await logAudit(admin.id, "change_role", "USER", targetUserId, JSON.stringify({ from: target.role, to: newRole }));
  revalidatePath("/admin");
  redirect("/admin/users");
}

export async function adminEditArticleAction(formData: FormData) {
  const admin = await requireRole(["ADMIN", "MODERATOR"]);
  const articleId = String(formData.get("articleId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const status = String(formData.get("status") ?? "") as ContentStatus;

  if (!articleId) throw new Error("Article ID missing");
  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) throw new Error("Статья не найдена");

  await prisma.article.update({
    where: { id: articleId },
    data: {
      ...(title ? { title } : {}),
      ...(summary ? { summary } : {}),
      ...(body ? { body } : {}),
      ...(["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "REJECTED"].includes(status) ? { status } : {})
    }
  });

  await logAudit(admin.id, "edit_article", "ARTICLE", articleId, JSON.stringify({ title, status }));
  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/articles");
  redirect("/admin/content?tab=articles");
}

export async function adminEditListingAction(formData: FormData) {
  const admin = await requireRole(["ADMIN", "MODERATOR"]);
  const listingId = String(formData.get("listingId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "") as ContentStatus;

  if (!listingId) throw new Error("Listing ID missing");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Размещение не найдено");

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "REJECTED"].includes(status) ? { status } : {})
    }
  });

  await logAudit(admin.id, "edit_listing", "LISTING", listingId, JSON.stringify({ title, status }));
  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/vacancies");
  revalidatePath("/services");
  redirect("/admin/content?tab=listings");
}

export async function adminEditProductAction(formData: FormData) {
  const admin = await requireRole(["ADMIN", "MODERATOR"]);
  const productId = String(formData.get("productId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "") as ContentStatus;

  if (!productId) throw new Error("Product ID missing");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Товар не найден");

  await prisma.product.update({
    where: { id: productId },
    data: {
      ...(title ? { title } : {}),
      ...(["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "REJECTED"].includes(status) ? { status } : {}),
      ...(status === ContentStatus.ARCHIVED ? { hiddenReason: "Скрыто администратором" } : {}),
      ...(status === ContentStatus.PUBLISHED ? { hiddenReason: null } : {})
    }
  });

  await logAudit(admin.id, "edit_product", "PRODUCT", productId, JSON.stringify({ title, status }));
  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/products");
  redirect("/admin/content?tab=products");
}

export async function adminEditResumeAction(formData: FormData) {
  const admin = await requireRole(["ADMIN", "MODERATOR"]);
  const resumeId = String(formData.get("resumeId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const roleGoal = String(formData.get("roleGoal") ?? "").trim();
  const isPublic = String(formData.get("isPublic") ?? "true") === "true";

  if (!resumeId) throw new Error("Resume ID missing");
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) throw new Error("Резюме не найдено");

  await prisma.resume.update({
    where: { id: resumeId },
    data: {
      ...(title ? { title } : {}),
      ...(roleGoal ? { roleGoal } : {}),
      isPublic,
      hiddenByInactivity: !isPublic ? true : false,
      ...(isPublic ? { lastVisitedAt: new Date(), expiresAt: resume.expiresAt && resume.expiresAt > new Date() ? resume.expiresAt : resumeExpiresAt() } : {})
    }
  });

  await logAudit(admin.id, "edit_resume", "RESUME", resumeId, JSON.stringify({ title, roleGoal, isPublic }));
  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/resumes");
  redirect("/admin/content?tab=resumes");
}

export async function adminEditMatchProfileAction(formData: FormData) {
  const admin = await requireRole(["ADMIN", "MODERATOR"]);
  const matchProfileId = String(formData.get("matchProfileId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "") as ContentStatus;

  if (!matchProfileId) throw new Error("Match profile ID missing");
  const profile = await prisma.matchProfile.findUnique({ where: { id: matchProfileId } });
  if (!profile) throw new Error("Анкета не найдена");

  await prisma.matchProfile.update({
    where: { id: matchProfileId },
    data: {
      ...(title ? { title } : {}),
      ...(["DRAFT", "PENDING_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED", "REJECTED"].includes(status) ? { status } : {}),
      ...(status === ContentStatus.ARCHIVED ? { hiddenReason: "Скрыто администратором" } : {}),
      ...(status === ContentStatus.PUBLISHED ? { hiddenReason: null } : {})
    }
  });

  await logAudit(admin.id, "edit_match_profile", "MATCH_PROFILE", matchProfileId, JSON.stringify({ title, status }));
  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/model-operator");
  redirect("/admin/content?tab=matches");
}

export async function adminDeleteContentAction(formData: FormData) {
  const admin = await requireRole(["ADMIN", "MODERATOR"]);
  const rawType = String(formData.get("targetType") ?? formData.get("contentType") ?? "");
  const targetType = rawType.toUpperCase();
  const targetId = String(formData.get("targetId") ?? formData.get("contentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!targetId || !targetType) throw new Error("Missing target");

  if (targetType === "ARTICLE") {
    await prisma.article.update({ where: { id: targetId }, data: { status: ContentStatus.ARCHIVED, hiddenReason: reason || "Удалено администратором" } });
  } else if (targetType === "LISTING") {
    await prisma.listing.update({ where: { id: targetId }, data: { status: ContentStatus.ARCHIVED, hiddenReason: reason || "Удалено администратором" } });
  } else if (targetType === "PRODUCT") {
    await prisma.product.update({ where: { id: targetId }, data: { status: ContentStatus.ARCHIVED, hiddenReason: reason || "Удалено администратором" } });
  } else if (targetType === "RESUME") {
    await prisma.resume.update({ where: { id: targetId }, data: { isPublic: false, hiddenByInactivity: true } });
  } else if (targetType === "MATCH_PROFILE") {
    await prisma.matchProfile.update({ where: { id: targetId }, data: { status: ContentStatus.ARCHIVED, hiddenReason: reason || "Удалено администратором" } });
  } else {
    throw new Error("Неизвестный тип контента");
  }

  await logAudit(admin.id, "delete_content", targetType, targetId, reason);
  revalidatePath("/admin");
  revalidatePath("/admin/content");
  revalidatePath("/articles");
  revalidatePath("/vacancies");
  revalidatePath("/services");
  revalidatePath("/products");
  revalidatePath("/resumes");
  revalidatePath("/model-operator");
  const tab = targetType === "ARTICLE" ? "articles" : targetType === "LISTING" ? "listings" : targetType === "PRODUCT" ? "products" : targetType === "RESUME" ? "resumes" : "matches";
  redirect(`/admin/content?tab=${tab}`);
}

// ---------------------------------------------------------------------------
// Guide CRUD (admin only)
// ---------------------------------------------------------------------------

function guideDataFromForm(fd: FormData) {
  return {
    kind: requireText(fd.get("kind"), "kind"),
    slug: requireText(fd.get("slug"), "slug"),
    path: requireText(fd.get("path"), "path"),
    title: requireText(fd.get("title"), "title"),
    h1: requireText(fd.get("h1"), "h1"),
    description: requireMultiline(fd.get("description"), "description"),
    intro: requireMultiline(fd.get("intro"), "intro"),
    audience: cleanMultiline(fd.get("audience"), 1000) || null,
    keywords: (cleanText(fd.get("keywords"), 2000) || "").split(",").map((k) => k.trim()).filter(Boolean),
    sections: requireMultiline(fd.get("sections"), "sections"),
    faq: requireMultiline(fd.get("faq"), "faq"),
    ctaLabel: cleanText(fd.get("ctaLabel"), 200) || null,
    ctaHref: cleanText(fd.get("ctaHref"), 500) || null,
    related: (cleanText(fd.get("related"), 2000) || "").split(",").map((r) => r.trim()).filter(Boolean),
    category: cleanText(fd.get("category"), 200) || null,
    quickAnswer: cleanMultiline(fd.get("quickAnswer"), 2000) || null,
    checklist: cleanMultiline(fd.get("checklist"), 5000) || null,
    mistakes: cleanMultiline(fd.get("mistakes"), 5000) || null,
    isPublished: fd.get("isPublished") === "on",
    showOnHome: fd.get("showOnHome") === "on",
    sortOrder: cleanNumber(fd.get("sortOrder")) ?? 0,
  };
}

export async function createGuideAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const data = guideDataFromForm(formData);
  const guide = await prisma.guide.create({ data });
  await logAudit(admin.id, "create_guide", "Guide", guide.id);
  revalidatePath("/admin/guides");
  revalidatePath("/guides");
  revalidatePath("/");
  redirect("/admin/guides");
}

export async function updateGuideAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const id = requireText(formData.get("id"), "id");
  const data = guideDataFromForm(formData);
  await prisma.guide.update({ where: { id }, data });
  await logAudit(admin.id, "update_guide", "Guide", id);
  revalidatePath("/admin/guides");
  revalidatePath("/guides");
  revalidatePath("/");
  redirect("/admin/guides");
}

export async function deleteGuideAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const id = requireText(formData.get("id"), "id");
  await prisma.guide.delete({ where: { id } });
  await logAudit(admin.id, "delete_guide", "Guide", id);
  revalidatePath("/admin/guides");
  revalidatePath("/");
}

export async function toggleGuideHomeAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const id = requireText(formData.get("id"), "id");
  const guide = await prisma.guide.findUniqueOrThrow({ where: { id } });
  await prisma.guide.update({ where: { id }, data: { showOnHome: !guide.showOnHome } });
  await logAudit(admin.id, "toggle_guide_home", "Guide", id, `showOnHome → ${!guide.showOnHome}`);
  revalidatePath("/admin/guides");
  revalidatePath("/");
}

export async function toggleGuidePublishAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const id = requireText(formData.get("id"), "id");
  const guide = await prisma.guide.findUniqueOrThrow({ where: { id } });
  await prisma.guide.update({ where: { id }, data: { isPublished: !guide.isPublished } });
  await logAudit(admin.id, "toggle_guide_publish", "Guide", id, `isPublished → ${!guide.isPublished}`);
  revalidatePath("/admin/guides");
  revalidatePath("/");
}

/* ── Useful Links ── */

export async function createUsefulLinkAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const title = requireText(formData.get("title"), "title");
  const url = requireText(formData.get("url"), "url");
  const topic = requireText(formData.get("topic"), "topic");
  const description = requireMultiline(formData.get("description"), "description");
  const sortOrder = cleanNumber(formData.get("sortOrder")) ?? 0;
  const isPublished = formData.get("isPublished") === "on";

  const link = await prisma.usefulLink.create({
    data: { title, url, topic, description, sortOrder, isPublished },
  });
  await logAudit(admin.id, "create_useful_link", "UsefulLink", link.id);
  revalidatePath("/admin/links");
  revalidatePath("/links");
  redirect("/admin/links");
}

export async function updateUsefulLinkAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const id = requireText(formData.get("id"), "id");
  const title = requireText(formData.get("title"), "title");
  const url = requireText(formData.get("url"), "url");
  const topic = requireText(formData.get("topic"), "topic");
  const description = requireMultiline(formData.get("description"), "description");
  const sortOrder = cleanNumber(formData.get("sortOrder")) ?? 0;
  const isPublished = formData.get("isPublished") === "on";

  await prisma.usefulLink.update({
    where: { id },
    data: { title, url, topic, description, sortOrder, isPublished },
  });
  await logAudit(admin.id, "update_useful_link", "UsefulLink", id);
  revalidatePath("/admin/links");
  revalidatePath("/links");
  redirect("/admin/links");
}

export async function deleteUsefulLinkAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const id = requireText(formData.get("id"), "id");
  await prisma.usefulLink.delete({ where: { id } });
  await logAudit(admin.id, "delete_useful_link", "UsefulLink", id);
  revalidatePath("/admin/links");
  revalidatePath("/links");
}

export async function toggleUsefulLinkAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const id = requireText(formData.get("id"), "id");
  const link = await prisma.usefulLink.findUniqueOrThrow({ where: { id } });
  await prisma.usefulLink.update({ where: { id }, data: { isPublished: !link.isPublished } });
  await logAudit(admin.id, "toggle_useful_link", "UsefulLink", id, `isPublished → ${!link.isPublished}`);
  revalidatePath("/admin/links");
  revalidatePath("/links");
}
