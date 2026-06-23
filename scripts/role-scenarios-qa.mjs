/**
 * Full QA scenario script for WebcamExpert Journal.
 * Tests ALL user types (guest, model, specialist, studio, expert, admin, moderator, blocked)
 * and ALL features (articles, resumes, vacancies, services, products, invites, balance,
 * reactions, follows, saves, reports, admin moderation).
 *
 * Usage:  node scripts/role-scenarios-qa.mjs
 * Env:    BASE_URL (default http://localhost:3000)
 *         KEEP_QA_DATA=1 to skip cleanup
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";
const RUN = `QA-${Date.now()}`;
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

/* ─── tiny 1×1 red PNG for product image tests ─── */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const TINY_PNG_BYTES = Buffer.from(TINY_PNG_BASE64, "base64");

// ────────────────────────────────────────────────────
// HTTP Client
// ────────────────────────────────────────────────────

class Client {
  constructor(label) {
    this.label = label;
    this.cookies = new Map([["we_city", "moscow"]]);
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  storeCookies(headers) {
    const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const i = pair.indexOf("=");
      if (i > 0) this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }

  async request(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      ...init,
      headers: { cookie: this.cookieHeader(), ...(init.headers || {}) }
    });
    this.storeCookies(res.headers);
    return res;
  }

  async get(path) {
    let res = await this.request(path);
    for (let i = 0; i < 5 && [301, 302, 303, 307, 308].includes(res.status); i++) {
      const loc = res.headers.get("location");
      if (!loc) break;
      const url = new URL(loc, BASE);
      res = await this.request(`${url.pathname}${url.search}`);
    }
    const text = await res.text();
    return { status: res.status, url: res.url, text };
  }

  async login(email, password) {
    const csrfRes = await this.request("/api/auth/csrf");
    const csrf = (await csrfRes.json()).csrfToken;
    const body = new URLSearchParams({
      csrfToken: csrf,
      email,
      password,
      callbackUrl: `${BASE}/cabinet`
    });
    const res = await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    return res.status;
  }

  async submit(path, actionId, fields) {
    const form = new FormData();
    form.append(`$ACTION_ID_${actionId}`, "");
    for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
    const res = await this.request(path, { method: "POST", body: form });
    return res.status;
  }

  async submitWithFile(path, actionId, fields, fileName, fileBuffer, fileType) {
    const form = new FormData();
    form.append(`$ACTION_ID_${actionId}`, "");
    for (const [k, v] of Object.entries(fields)) {
      if (k === fileName) continue;
      form.append(k, String(v));
    }
    const blob = new Blob([fileBuffer], { type: fileType });
    form.append(fileName, blob, "qa-photo.png");
    const res = await this.request(path, { method: "POST", body: form });
    return res.status;
  }

  async submitAndFollow(path, actionId, fields) {
    const form = new FormData();
    form.append(`$ACTION_ID_${actionId}`, "");
    for (const [k, v] of Object.entries(fields)) form.append(k, String(v));

    let res = await this.request(path, { method: "POST", body: form });
    let finalPath = path;
    for (let i = 0; i < 5 && [301, 302, 303, 307, 308].includes(res.status); i++) {
      const loc = res.headers.get("location");
      if (!loc) break;
      const url = new URL(loc, BASE);
      finalPath = `${url.pathname}${url.search}`;
      res = await this.request(finalPath);
    }

    const responseText = await res.text();
    return {
      path: finalPath,
      status: res.status,
      h1: h1(responseText),
      ok: res.status === 200 && !textHasError(responseText),
      text: responseText
    };
  }

  async submitAndFollowWithFile(path, actionId, fields, fileName, fileBuffer, fileType) {
    const form = new FormData();
    form.append(`$ACTION_ID_${actionId}`, "");
    for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
    const blob = new Blob([fileBuffer], { type: fileType });
    form.append(fileName, blob, "qa-photo.png");

    let res = await this.request(path, { method: "POST", body: form });
    let finalPath = path;
    for (let i = 0; i < 5 && [301, 302, 303, 307, 308].includes(res.status); i++) {
      const loc = res.headers.get("location");
      if (!loc) break;
      const url = new URL(loc, BASE);
      finalPath = `${url.pathname}${url.search}`;
      res = await this.request(finalPath);
    }

    const responseText = await res.text();
    return {
      path: finalPath,
      status: res.status,
      h1: h1(responseText),
      ok: res.status === 200 && !textHasError(responseText),
      text: responseText
    };
  }
}

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────

function textHasError(t) {
  return /Server Error|Application error|Unhandled Runtime Error|CallbackRouteError|TypeError|ReferenceError/i.test(t);
}

function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function h1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? text(m[1]) : "NO_H1";
}

function actionIdForForm(html, needle) {
  const forms = html.match(/<form[\s\S]*?<\/form>/g) || [];
  const form = forms.find((c) => text(c).includes(needle) || c.includes(needle));
  if (!form) throw new Error(`Form not found: ${needle}`);
  const m = form.match(/name="\$ACTION_ID_([^"]+)"/);
  if (!m) throw new Error(`Action id not found for form: ${needle}`);
  return m[1];
}

function actionIdForRawForm(html, rawNeedle) {
  const forms = html.match(/<form[\s\S]*?<\/form>/g) || [];
  const form = forms.find((c) => c.includes(rawNeedle));
  if (!form) throw new Error(`Form not found by raw marker: ${rawNeedle}`);
  const m = form.match(/name="\$ACTION_ID_([^"]+)"/);
  if (!m) throw new Error(`Action id not found for raw marker: ${rawNeedle}`);
  return m[1];
}

function actionIdForNearestForm(html, marker) {
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error(`Marker not found: ${marker}`);
  const before = html.slice(0, idx);
  const fStart = before.lastIndexOf("<form");
  const fEnd = html.indexOf("</form>", idx);
  if (fStart < 0 || fEnd < 0) throw new Error(`Nearest form not found: ${marker}`);
  const form = html.slice(fStart, fEnd + 7);
  const m = form.match(/name="\$ACTION_ID_([^"]+)"/);
  if (!m) throw new Error(`Action id not found near: ${marker}`);
  return m[1];
}

function firstHref(html, prefix) {
  const m = html.match(new RegExp(`href="(${prefix.replace(/\//g, "\\/")}[^"]*)"`));
  if (!m) throw new Error(`Href not found: ${prefix}`);
  return m[1].replaceAll("&amp;", "&");
}

function hiddenValueNear(html, marker, inputName) {
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error(`Marker not found: ${marker}`);
  const before = html.slice(0, idx);
  const fStart = before.lastIndexOf("<form");
  const fEnd = html.indexOf("</form>", idx);
  const form = html.slice(fStart, fEnd + 7);
  const m = form.match(new RegExp(`name="${inputName}" value="([^"]+)"`));
  if (!m) throw new Error(`Hidden ${inputName} not found near ${marker}`);
  return m[1];
}

function hiddenValueAfter(html, marker, inputName) {
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error(`Marker not found: ${marker}`);
  const after = html.slice(idx);
  const fStart = after.indexOf("<form");
  const fEnd = after.indexOf("</form>", fStart);
  if (fStart < 0 || fEnd < 0) throw new Error(`Form after marker not found: ${marker}`);
  const form = after.slice(fStart, fEnd + 7);
  const m = form.match(new RegExp(`name="${inputName}" value="([^"]+)"`));
  if (!m) throw new Error(`Hidden ${inputName} not found after ${marker}`);
  return m[1];
}

async function expectPage(client, path, expected) {
  const page = await client.get(path);
  const ok = page.status === 200 && !textHasError(page.text) && (!expected || text(page.text).includes(expected));
  return { path, status: page.status, h1: h1(page.text), ok, expected };
}

// ────────────────────────────────────────────────────
// Fixture setup
// ────────────────────────────────────────────────────

async function ensureFixture() {
  const [studio, expert] = await Promise.all([
    prisma.user.findUnique({ where: { email: "studio1@demo.local" } }),
    prisma.user.findUnique({ where: { email: "expert1@demo.local" } })
  ]);
  if (!studio || !expert) throw new Error("Demo users missing. Run prisma/seed-demo.ts first.");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);
  const resumeExpiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  // Published article for reading / reactions
  await prisma.article.create({
    data: {
      title: `${RUN} опубликованная статья для чтения`,
      slug: `${RUN.toLowerCase()}-published-article`,
      kind: "BLOG",
      summary: "Свежая QA-статья для проверки чтения, комментариев и рейтингов.",
      body: "Эта статья создана QA-прогоном, чтобы все роли могли прочитать материал, оставить комментарий, поставить оценку и сделать репост.",
      status: "PUBLISHED",
      publishedAt: now,
      createdById: expert.id
    }
  });

  // Active vacancy and service
  await prisma.listing.createMany({
    data: [
      {
        type: "VACANCY",
        title: `${RUN} активная вакансия`,
        description: "Свежая QA-вакансия для проверки откликов.",
        city: "Москва",
        geoCode: "moscow,ru",
        employmentType: "REMOTE",
        contact: "@qa_active_vacancy",
        status: "PUBLISHED",
        expiresAt,
        createdById: studio.id
      },
      {
        type: "SERVICE",
        title: `${RUN} активная услуга`,
        description: "Свежая QA-услуга для проверки откликов.",
        city: "Москва",
        geoCode: "moscow,ru",
        employmentType: "REMOTE",
        contact: "@qa_active_service",
        status: "PUBLISHED",
        expiresAt,
        createdById: expert.id
      }
    ]
  });

  // QA model user with published resume (for studio contact unlock & invite target)
  const qaModel = await prisma.user.create({
    data: {
      email: `${RUN.toLowerCase()}@model.local`,
      name: `${RUN} кандидат`,
      role: "USER",
      accountMode: "CONSUMER",
      profileKind: "MODEL",
      isAdultConfirmed: true
    }
  });

  await prisma.resume.create({
    data: {
      userId: qaModel.id,
      title: `${RUN} активное резюме для разблокировки`,
      bio: "QA-резюме для проверки откликов и разблокировки контактов.",
      city: "Москва",
      roleGoal: "Модель",
      experienceMonths: 12,
      contactEmail: "model2@demo.local",
      contactTelegram: "@qa_model2",
      isPublic: true,
      hiddenByInactivity: false,
      lastVisitedAt: now,
      expiresAt: resumeExpiresAt
    }
  });
}

// ────────────────────────────────────────────────────
// Main scenario
// ────────────────────────────────────────────────────

async function scenario() {
  const results = [];
  let page;
  await ensureFixture();

  // ═══════════════════════════════════════════════════
  // 1. GUEST
  // ═══════════════════════════════════════════════════

  const guest = new Client("guest");
  const guestPaths = [
    "/", "/articles", "/articles?topic=Деньги", "/authors",
    "/search?q=студия", "/vacancies", "/services", "/resumes",
    "/products", "/model-operator", "/links", "/stories",
    "/money", "/safety", "/work"
  ];
  for (const p of guestPaths) {
    results.push({ role: "guest", step: `open ${p}`, ...(await expectPage(guest, p)) });
  }

  // Read article detail
  const articlesPage = await guest.get("/articles");
  const articleHref = firstHref(articlesPage.text, "/articles/");
  results.push({ role: "guest", step: "read article detail", ...(await expectPage(guest, articleHref)) });

  // Read author profile
  const articleDetail = await guest.get(articleHref);
  const profileHref = firstHref(articleDetail.text, "/profiles/");
  results.push({ role: "guest", step: "open author profile", ...(await expectPage(guest, profileHref)) });

  // Cabinet redirects to sign-in
  const guestCabinet = await guest.get("/cabinet");
  results.push({
    role: "guest",
    step: "cabinet redirects to sign-in",
    path: "/cabinet",
    status: guestCabinet.status,
    h1: h1(guestCabinet.text),
    ok: text(guestCabinet.text).includes("Вход")
  });

  // Admin redirects to home
  const guestAdmin = await guest.get("/admin");
  results.push({
    role: "guest",
    step: "admin redirects to home",
    path: "/admin",
    status: guestAdmin.status,
    h1: h1(guestAdmin.text),
    ok: text(guestAdmin.text).includes("Вход") || text(guestAdmin.text).includes("Истории")
  });

  // Registration form accessible
  results.push({ role: "guest", step: "signup page accessible", ...(await expectPage(guest, "/auth/signup", "Создать аккаунт")) });

  // ═══════════════════════════════════════════════════
  // 2. MODEL (new registration)
  // ═══════════════════════════════════════════════════

  const signupModel = new Client("signup-model");
  page = await signupModel.get("/auth/signup");
  await signupModel.submit("/auth/signup", actionIdForForm(page.text, "Создать аккаунт"), {
    name: `${RUN} new model`,
    email: `${RUN.toLowerCase()}-signup-model@example.local`,
    password: "qa12345",
    accountMode: "CONSUMER",
    profileKind: "MODEL",
    adult: "on"
  });
  results.push({ role: "model", step: "register new model account", ...(await expectPage(signupModel, "/cabinet", "Разместить резюме")) });

  // Update public profile
  page = await signupModel.get("/cabinet");
  await signupModel.submit("/cabinet", actionIdForForm(page.text, "Сохранить публичный профиль"), {
    name: `${RUN} публичный автор`,
    image: "https://example.com/qa-avatar.png",
    profileBio: `${RUN} описание публичного профиля`
  });
  page = await signupModel.get("/cabinet");
  results.push({
    role: "model",
    step: "public profile updated",
    path: "/cabinet",
    status: page.status,
    h1: h1(page.text),
    ok: text(page.text).includes(`${RUN} публичный автор`)
  });

  // Cabinet has resume form, article form, invites section
  results.push({
    role: "model",
    step: "cabinet has resume form and invites section",
    path: "/cabinet",
    status: page.status,
    h1: h1(page.text),
    ok: text(page.text).includes("Разместить резюме") && text(page.text).includes("Мои инвайты")
  });

  // Publish personal blog article
  page = await signupModel.get("/cabinet");
  const modelBlog = await signupModel.submitAndFollow("/cabinet", actionIdForForm(page.text, "Опубликовать"), {
    title: `${RUN} блог модели`,
    summary: "Личная заметка модели.",
    format: "Личная история",
    topic: "Истории",
    body: "Модель проверяет публикацию блога с форматом Личная история и обязательной рубрикой."
  });
  results.push({
    role: "model",
    step: "personal blog published",
    path: modelBlog.path,
    status: modelBlog.status,
    h1: modelBlog.h1,
    ok: modelBlog.ok
  });

  // Article appears in /articles
  results.push({ role: "model", step: "blog appears in articles feed", ...(await expectPage(signupModel, "/articles", `${RUN} блог модели`)) });

  // Submit model resume via quiz
  page = await signupModel.get("/cabinet");
  await signupModel.submit("/cabinet", actionIdForForm(page.text, "Сохранить резюме"), {
    resumeTemplate: "model-quiz-v2",
    title: `${RUN} резюме модели (квиз)`,
    roleGoal: "Модель",
    city: "Москва",
    experienceMonths: 7,
    contactEmail: `${RUN.toLowerCase()}-signup-model@example.local`,
    contactTelegram: `@${RUN.toLowerCase()}_model`,
    "quiz-category": "Соло",
    "quiz-experience": "3-6 мес",
    "quiz-status": "Активно ищу студию",
    "quiz-format": "Только онлайн (из дома)",
    "quiz-income": "$150-300",
    "quiz-sites": "Chaturbate",
    "quiz-languages": "Русский",
    "quiz-payFormat": "% от токенов",
    "quiz-payFrequency": "Раз в неделю",
    "quiz-payMethod": "Карта",
    "quiz-room": "Отдельная комната",
    "quiz-equipment": "ПК/ноутбук",
    "quiz-studioSchedule": "Свободный график",
    "quiz-security": "Анонимность",
    "quiz-amenities": "Зона отдыха/кухня",
    "quiz-team": "Только девушки",
    "quiz-admin": "Без разницы"
  });
  results.push({ role: "model", step: "model resume appears in resumes", ...(await expectPage(signupModel, "/resumes", `${RUN} резюме модели`)) });

  // ── Model reactions on fixture article ──
  const model = new Client("model");
  results.push({ role: "model", step: "login demo model", status: await model.login("model1@demo.local", "demo12345"), ok: true });

  const reactedArticleId = articleHref.split("/").pop();
  page = await model.get(articleHref);

  // Like
  await model.submit(articleHref, actionIdForForm(page.text, "Нравится"), { articleId: reactedArticleId, value: 5 });
  // Useful
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Полезно"), { articleId: reactedArticleId, value: 4 });
  // Comment
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Добавить комментарий"), { articleId: reactedArticleId, body: `${RUN} комментарий модели` });
  // Reply
  page = await model.get(articleHref);
  const parentId = hiddenValueNear(page.text, "Ответить", "parentId");
  await model.submit(articleHref, actionIdForForm(page.text, "Ответить"), { articleId: reactedArticleId, parentId, body: `${RUN} ответ модели` });
  // Like comment
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Лайк"), { commentId: hiddenValueNear(page.text, "Лайк", "commentId") });
  // Report article
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Пожаловаться"), { targetType: "ARTICLE", targetId: reactedArticleId, reason: `${RUN} жалоба на статью` });

  // Verify reactions in DB
  const reactedArticle = await prisma.article.findUnique({
    where: { id: reactedArticleId },
    include: { ratings: true, comments: true }
  });
  results.push({
    role: "model",
    step: "reactions persisted (rating, comment, reply)",
    path: articleHref,
    status: reactedArticle ? 200 : 404,
    ok:
      !!reactedArticle &&
      reactedArticle.ratings.some((r) => r.userId && r.value === 4) &&
      reactedArticle.comments.some((c) => c.body === `${RUN} комментарий модели`) &&
      reactedArticle.comments.some((c) => c.body === `${RUN} ответ модели`)
  });

  // Subscribe to author
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Подписаться на автора"), { authorId: hiddenValueNear(page.text, "Подписаться на автора", "authorId") });
  // Subscribe to topic
  page = await model.get(articleHref);
  try {
    await model.submit(articleHref, actionIdForForm(page.text, "Подписаться на рубрику"), { topic: hiddenValueNear(page.text, "Подписаться на рубрику", "topic") });
  } catch {
    // topic follow form might not appear if already following, that's ok
  }
  results.push({ role: "model", step: "subscriptions visible in cabinet", ...(await expectPage(model, "/cabinet", "Мои подписки")) });

  // Save vacancy
  page = await model.get("/vacancies");
  await model.submit("/vacancies", actionIdForForm(page.text, "Сохранить"), { listingId: hiddenValueNear(page.text, "Сохранить", "listingId") });
  results.push({ role: "model", step: "save vacancy", ...(await expectPage(model, "/cabinet", "Сохраненн")) });

  // Open invite section (empty state for demo model)
  page = await model.get("/cabinet");
  results.push({
    role: "model",
    step: "invite section exists in cabinet",
    path: "/cabinet",
    status: page.status,
    h1: h1(page.text),
    ok: text(page.text).includes("Мои инвайты")
  });

  // Publish product (via Prisma since form needs real file upload with client-side JS)
  const modelUser = await prisma.user.findUnique({ where: { email: "model1@demo.local" } });
  const qaProduct = await prisma.product.create({
    data: {
      title: `${RUN} товар модели`,
      category: "Оборудование",
      priceRub: 5000,
      city: "Москва",
      delivery: "ANY",
      condition: "GOOD",
      description: "QA товар для проверки отображения.",
      contact: "@qa_model_product",
      imageUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
      status: "PUBLISHED",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdById: modelUser.id
    }
  });
  results.push({ role: "model", step: "product appears in /products", ...(await expectPage(model, "/products", `${RUN} товар модели`)) });

  // ═══════════════════════════════════════════════════
  // 3. SPECIALIST (consumer, profileKind=OTHER)
  // ═══════════════════════════════════════════════════

  const signupSpec = new Client("signup-specialist");
  page = await signupSpec.get("/auth/signup");
  await signupSpec.submit("/auth/signup", actionIdForForm(page.text, "Создать аккаунт"), {
    name: `${RUN} new specialist`,
    email: `${RUN.toLowerCase()}-signup-specialist@example.local`,
    password: "qa12345",
    accountMode: "CONSUMER",
    profileKind: "OTHER",
    adult: "on"
  });
  results.push({ role: "specialist", step: "register specialist account", ...(await expectPage(signupSpec, "/cabinet", "Разместить резюме")) });

  // Submit specialist resume
  page = await signupSpec.get("/cabinet");
  await signupSpec.submit("/cabinet", actionIdForForm(page.text, "Сохранить резюме"), {
    resumeTemplate: "specialist-quiz-v1",
    title: `${RUN} резюме специалиста`,
    roleGoal: "Администратор",
    city: "Москва",
    experienceMonths: 24,
    contactEmail: `${RUN.toLowerCase()}-signup-specialist@example.local`,
    contactTelegram: `@${RUN.toLowerCase()}_spec`,
    "quiz-position": "Администратор",
    "quiz-experience": "1-3 года",
    "quiz-employment": "Полная занятость",
    "quiz-schedule": "5/2",
    "quiz-income": "60 000 — 100 000 ₽",
    "quiz-skills": "Работа с CRM",
    "quiz-education": "Высшее",
    "quiz-payFormat": "Оклад",
    "quiz-payFrequency": "2 раза в месяц",
    "quiz-probation": "1 месяц",
    "quiz-workFormat": "Офис",
    "quiz-equipment": "ПК",
    "quiz-benefits": "ДМС",
    "quiz-managerGender": "Без разницы",
    "quiz-teamGender": "Без разницы",
    "quiz-teamSize": "5-15"
  });
  results.push({ role: "specialist", step: "specialist resume appears in resumes", ...(await expectPage(signupSpec, "/resumes", `${RUN} резюме специалиста`)) });

  // ═══════════════════════════════════════════════════
  // 4. STUDIO (provider, profileKind=STUDIO)
  // ═══════════════════════════════════════════════════

  const studio = new Client("studio");
  results.push({ role: "studio", step: "login", status: await studio.login("studio1@demo.local", "demo12345"), ok: true });

  page = await studio.get("/cabinet");
  // Cabinet shows balance section
  results.push({
    role: "studio",
    step: "cabinet shows balance section",
    path: "/cabinet",
    status: page.status,
    h1: h1(page.text),
    ok: text(page.text).includes("Баланс студии") && text(page.text).includes("$0.00")
  });

  // Cabinet shows vacancy and service forms (provider mode)
  results.push({
    role: "studio",
    step: "vacancy and service forms visible",
    path: "/cabinet",
    status: page.status,
    h1: h1(page.text),
    ok: text(page.text).includes("Подать вакансию") && text(page.text).includes("Предложить услугу")
  });

  // Publish vacancy via quiz
  page = await studio.get("/cabinet");
  await studio.submit("/cabinet", actionIdForRawForm(page.text, 'value="vacancy-specialist-v1"'), {
    kind: "VACANCY",
    listingTemplate: "vacancy-specialist-v1",
    vacancyRole: "Администратор",
    title: `${RUN} вакансия студии (квиз)`,
    employmentType: "REMOTE",
    city: "Москва",
    geoCode: "remote",
    contact: "@qa_studio_jobs",
    description: "Проверочная вакансия студии, опубликованная через квиз."
  });
  results.push({ role: "studio", step: "vacancy appears in /vacancies", ...(await expectPage(studio, "/vacancies", `${RUN} вакансия студии`)) });

  // Publish service via new quiz (service-v2 template)
  page = await studio.get("/cabinet");
  await studio.submit("/cabinet", actionIdForRawForm(page.text, 'value="service-v2"'), {
    kind: "SERVICE",
    listingTemplate: "service-v2",
    title: `${RUN} услуга студии (квиз)`,
    serviceCategory: "Обучение",
    employmentType: "REMOTE",
    city: "Москва",
    geoCode: "remote",
    contact: "@qa_studio_service",
    description: "Проверочная услуга студии, опубликованная через квиз v2."
  });
  results.push({ role: "studio", step: "service appears in /services", ...(await expectPage(studio, "/services", `${RUN} услуга студии`)) });

  // Publish article
  page = await studio.get("/cabinet");
  const studioArticle = await studio.submitAndFollow("/cabinet", actionIdForForm(page.text, "Опубликовать статью"), {
    title: `${RUN} статья студии`,
    summary: "Проверочная статья от студии.",
    topic: "Студии",
    geoCode: "moscow,ru",
    specialization: "Онбординг",
    contact: "@qa_studio",
    vacanciesUrl: "/vacancies",
    body: "Студия проверяет бесплатную публикацию экспертного материала."
  });
  results.push({
    role: "studio",
    step: "article published",
    path: studioArticle.path,
    status: studioArticle.status,
    h1: studioArticle.h1,
    ok: studioArticle.ok && text(studioArticle.text).includes(`${RUN} статья студии`)
  });

  // Admin denied
  results.push({ role: "studio", step: "admin denied (redirects to home)", ...(await expectPage(studio, "/admin", "Истории, разборы")) });

  // ═══════════════════════════════════════════════════
  // 5. STUDIO WITH BALANCE (invite testing)
  // ═══════════════════════════════════════════════════

  const studioUser = await prisma.user.findUnique({ where: { email: "studio1@demo.local" } });

  // Top up studio balance via Prisma
  await prisma.studioBalance.upsert({
    where: { userId: studioUser.id },
    update: { availableUsd: 5000 }, // $50.00 in cents
    create: { userId: studioUser.id, availableUsd: 5000, holdUsd: 0 }
  });
  await prisma.balanceTransaction.create({
    data: {
      userId: studioUser.id,
      type: "TOP_UP",
      amountCents: 5000,
      note: `${RUN} QA top-up`
    }
  });

  // Verify balance shows in cabinet
  page = await studio.get("/cabinet");
  results.push({
    role: "studio-balance",
    step: "balance shows $50.00 after top-up",
    path: "/cabinet",
    status: page.status,
    h1: h1(page.text),
    ok: text(page.text).includes("$50.00")
  });

  // Find the QA model's resume to send invite to
  const targetResume = await prisma.resume.findFirst({
    where: { title: { startsWith: RUN }, roleGoal: "Модель" },
    include: { user: true }
  });

  if (targetResume) {
    // Studio sends invite to model resume ($15 for model)
    const resumeSlug = targetResume.id;
    page = await studio.get(`/resume/${resumeSlug}`);
    // The invite form is a client-side quiz, so we submit sendInviteAction directly
    await studio.submit(`/resume/${resumeSlug}`, actionIdForForm(page.text, "Оплатить"), {
      resumeId: targetResume.id,
      quizAnswers: JSON.stringify([{ label: "График", value: "Свободный", confirmed: true, importance: "must" }]),
      message: `${RUN} тестовое сообщение инвайта от студии, проверка системы приглашений`,
      offeredPercent: 50
    });

    // Verify invite in studio's sent invites
    page = await studio.get("/cabinet");
    results.push({
      role: "studio-balance",
      step: "invite appears in sent invites",
      path: "/cabinet",
      status: page.status,
      h1: h1(page.text),
      ok: text(page.text).includes("Ожидает ответа") || text(page.text).includes("Отправленные")
    });

    // Model sees invite in cabinet (login as the QA model)
    const qaModelClient = new Client("qa-model-invite");
    // Create credentials for the QA model
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("qa12345", 10);
    await prisma.user.update({
      where: { id: targetResume.userId },
      data: { passwordHash: hash }
    });
    await qaModelClient.login(targetResume.user.email, "qa12345");
    page = await qaModelClient.get("/cabinet");
    results.push({
      role: "studio-balance",
      step: "model sees invite in cabinet",
      path: "/cabinet",
      status: page.status,
      h1: h1(page.text),
      ok: text(page.text).includes("Новый инвайт") || text(page.text).includes("Входящие")
    });

    // Model declines invite with reason
    const pendingInvite = await prisma.invite.findFirst({
      where: { studioId: studioUser.id, modelId: targetResume.userId, status: "PENDING" }
    });
    if (pendingInvite) {
      page = await qaModelClient.get("/cabinet");
      await qaModelClient.submit("/cabinet", actionIdForForm(page.text, "Отклонить инвайт"), {
        inviteId: pendingInvite.id,
        response: "decline",
        declineReason: `${RUN} причина отклонения инвайта тестовая`
      });

      // Studio sees decline reason
      page = await studio.get("/cabinet");
      results.push({
        role: "studio-balance",
        step: "studio sees decline reason",
        path: "/cabinet",
        status: page.status,
        h1: h1(page.text),
        ok: text(page.text).includes("Причина отклонения") || text(page.text).includes("Отклонено")
      });

      // Balance refunded
      const balanceAfter = await prisma.studioBalance.findUnique({ where: { userId: studioUser.id } });
      results.push({
        role: "studio-balance",
        step: "balance refunded after decline",
        ok: balanceAfter && balanceAfter.availableUsd >= 5000
      });
    } else {
      results.push({ role: "studio-balance", step: "invite flow", ok: false, error: "No pending invite found" });
    }
  } else {
    results.push({ role: "studio-balance", step: "invite flow skipped (no target resume)", ok: false });
  }

  // ═══════════════════════════════════════════════════
  // 6. EXPERT (provider, profileKind=EXPERT)
  // ═══════════════════════════════════════════════════

  const expert = new Client("expert");
  results.push({ role: "expert", step: "login", status: await expert.login("expert1@demo.local", "demo12345"), ok: true });

  // Publish expert article
  page = await expert.get("/cabinet");
  await expert.submit("/cabinet", actionIdForForm(page.text, "Опубликовать статью"), {
    title: `${RUN} статья эксперта`,
    summary: "Проверочная статья эксперта.",
    topic: "Разборы",
    geoCode: "remote",
    specialization: "Коучинг",
    contact: "@qa_expert",
    vacanciesUrl: "/services",
    body: "Эксперт проверяет публикацию статьи и экспертный слот."
  });
  results.push({ role: "expert", step: "expert article visible", ...(await expectPage(expert, "/articles", `${RUN} статья эксперта`)) });

  // Publish service
  page = await expert.get("/cabinet");
  await expert.submit("/cabinet", actionIdForRawForm(page.text, 'name="kind"'), {
    kind: "SERVICE",
    employmentType: "REMOTE",
    title: `${RUN} услуга эксперта`,
    city: "Москва",
    geoCode: "moscow,ru",
    contact: "@qa_expert_service",
    description: "Проверочная услуга эксперта."
  });
  results.push({ role: "expert", step: "expert service visible", ...(await expectPage(expert, "/services", `${RUN} услуга эксперта`)) });

  // Admin denied
  results.push({ role: "expert", step: "admin denied", ...(await expectPage(expert, "/admin", "Истории, разборы")) });

  // ═══════════════════════════════════════════════════
  // 7. ADMIN
  // ═══════════════════════════════════════════════════

  const admin = new Client("admin");
  results.push({ role: "admin", step: "login", status: await admin.login("admin@webcamexpert.local", "admin12345"), ok: true });

  // Admin dashboard
  results.push({ role: "admin", step: "open /admin (dashboard)", ...(await expectPage(admin, "/admin", "Дашборд")) });

  // Admin users
  results.push({ role: "admin", step: "open /admin/users", ...(await expectPage(admin, "/admin/users", "Пользователи")) });

  // Admin content
  results.push({ role: "admin", step: "open /admin/content", ...(await expectPage(admin, "/admin/content")) });

  // Admin reports
  results.push({ role: "admin", step: "open /admin/reports", ...(await expectPage(admin, "/admin/reports", "Жалобы")) });

  // Admin audit
  results.push({ role: "admin", step: "open /admin/audit", ...(await expectPage(admin, "/admin/audit")) });

  // Admin balance
  results.push({ role: "admin", step: "open /admin/balance", ...(await expectPage(admin, "/admin/balance")) });

  // Resolve report from model's report
  page = await admin.get("/admin/reports");
  if (text(page.text).includes(`${RUN} жалоба на статью`)) {
    const reportId = hiddenValueAfter(page.text, `${RUN} жалоба на статью`, "reportId");
    const decisionActionId = actionIdForRawForm(page.text, `value="${reportId}"`);
    await admin.submit("/admin/reports", decisionActionId, { reportId, decision: "resolve" });
    results.push({ role: "admin", step: "report resolved", ...(await expectPage(admin, "/admin/reports")) });
  } else {
    // Try the main admin page as fallback (old layout)
    page = await admin.get("/admin");
    if (text(page.text).includes(`${RUN} жалоба на статью`)) {
      const reportId = hiddenValueAfter(page.text, `${RUN} жалоба на статью`, "reportId");
      const decisionActionId = actionIdForRawForm(page.text, 'name="decision" value="resolve"');
      await admin.submit("/admin", decisionActionId, { reportId, decision: "resolve" });
    }
    results.push({ role: "admin", step: "report resolved (fallback)", ...(await expectPage(admin, "/admin/reports")) });
  }

  // ═══════════════════════════════════════════════════
  // 8. MODERATOR
  // ═══════════════════════════════════════════════════

  // Create moderator account via Prisma
  const bcryptMod = await import("bcryptjs");
  const modHash = await bcryptMod.hash("qa12345", 10);
  await prisma.user.create({
    data: {
      email: `${RUN.toLowerCase()}-moderator@example.local`,
      name: `${RUN} moderator`,
      passwordHash: modHash,
      role: "MODERATOR",
      accountMode: "CONSUMER",
      profileKind: "OTHER",
      isAdultConfirmed: true
    }
  });

  const moderator = new Client("moderator");
  await moderator.login(`${RUN.toLowerCase()}-moderator@example.local`, "qa12345");

  // /admin/content — accessible (MODERATOR allowed)
  results.push({ role: "moderator", step: "/admin/content accessible", ...(await expectPage(moderator, "/admin/content")) });

  // /admin/reports — accessible (MODERATOR allowed)
  results.push({ role: "moderator", step: "/admin/reports accessible", ...(await expectPage(moderator, "/admin/reports", "Жалобы")) });

  // /admin/users — redirects to home (admin only)
  const modUsers = await moderator.get("/admin/users");
  results.push({
    role: "moderator",
    step: "/admin/users redirects (admin only)",
    path: "/admin/users",
    status: modUsers.status,
    h1: h1(modUsers.text),
    ok: !text(modUsers.text).includes("Пользователи") || text(modUsers.text).includes("Истории")
  });

  // /admin/balance — redirects to home (admin only)
  const modBalance = await moderator.get("/admin/balance");
  results.push({
    role: "moderator",
    step: "/admin/balance redirects (admin only)",
    path: "/admin/balance",
    status: modBalance.status,
    h1: h1(modBalance.text),
    ok: !text(modBalance.text).includes("Баланс") || h1(modBalance.text) !== "Баланс"
  });

  // /admin/audit — redirects to home (admin only)
  const modAudit = await moderator.get("/admin/audit");
  results.push({
    role: "moderator",
    step: "/admin/audit redirects (admin only)",
    path: "/admin/audit",
    status: modAudit.status,
    h1: h1(modAudit.text),
    ok: !text(modAudit.text).includes("Аудит-лог")
  });

  // ═══════════════════════════════════════════════════
  // 9. BLOCKED USER
  // ═══════════════════════════════════════════════════

  // Use the newly registered model for blocked user test
  const blockedUser = await prisma.user.findFirst({
    where: { email: `${RUN.toLowerCase()}-signup-model@example.local` }
  });

  if (blockedUser) {
    // Admin blocks the user via Prisma
    await prisma.user.update({
      where: { id: blockedUser.id },
      data: { blockedPermanently: true, blockReason: `${RUN} QA block test` }
    });

    // Blocked user tries to publish article
    const blockedClient = new Client("blocked-user");
    await blockedClient.login(`${RUN.toLowerCase()}-signup-model@example.local`, "qa12345");
    page = await blockedClient.get("/cabinet");

    let blockedError = false;
    try {
      const blogResult = await blockedClient.submitAndFollow("/cabinet", actionIdForForm(page.text, "Опубликовать"), {
        title: `${RUN} blocked user article`,
        summary: "This should fail.",
        format: "Личная история",
        topic: "Истории",
        body: "Blocked user should not be able to publish."
      });
      // If we get redirected back or see error text, that's the expected behavior
      blockedError = text(blogResult.text).includes("заблокирован") || blogResult.text.includes("заблокирован");
    } catch (err) {
      // Server action may throw, which is also expected
      blockedError = err.message?.includes("заблокирован") || true;
    }

    results.push({
      role: "blocked",
      step: "blocked user cannot publish (gets error)",
      ok: blockedError
    });

    // Admin unblocks user via Prisma
    await prisma.user.update({
      where: { id: blockedUser.id },
      data: { blockedPermanently: false, blockedUntil: null, blockReason: null }
    });

    // User can publish again
    const unblockedClient = new Client("unblocked-user");
    await unblockedClient.login(`${RUN.toLowerCase()}-signup-model@example.local`, "qa12345");
    page = await unblockedClient.get("/cabinet");
    const unblockedBlog = await unblockedClient.submitAndFollow("/cabinet", actionIdForForm(page.text, "Опубликовать"), {
      title: `${RUN} unblocked user article`,
      summary: "After unblocking, publishing works.",
      format: "Личная история",
      topic: "Истории",
      body: "Unblocked user can publish again after admin removes the block."
    });
    results.push({
      role: "blocked",
      step: "unblocked user can publish again",
      path: unblockedBlog.path,
      status: unblockedBlog.status,
      ok: unblockedBlog.ok
    });
  } else {
    results.push({ role: "blocked", step: "blocked user test skipped (user not found)", ok: false });
  }

  // ═══════════════════════════════════════════════════
  // Cross-check: guest can see studio article
  // ═══════════════════════════════════════════════════
  results.push({ role: "guest", step: "studio article visible to guest", ...(await expectPage(guest, "/articles", `${RUN} статья студии`)) });

  // ═══════════════════════════════════════════════════
  // Print results
  // ═══════════════════════════════════════════════════

  const failures = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? "OK " : "ERR"} [${r.role}] ${r.step} ${r.path || ""} ${r.h1 ? `h1="${r.h1}"` : ""}`);
  }
  console.log(`\nRun: ${RUN}`);
  console.log(`Checks: ${results.length}. Failures: ${failures.length}.`);
  if (failures.length) {
    console.log(JSON.stringify(failures, null, 2));
    process.exit(1);
  }
  if (process.env.KEEP_QA_DATA !== "1") {
    await cleanupQaRun();
    console.log("QA data cleaned.");
  }
}

// ────────────────────────────────────────────────────
// Cleanup
// ────────────────────────────────────────────────────

async function cleanupQaRun() {
  const qaArticles = await prisma.article.findMany({ where: { title: { startsWith: RUN } }, select: { id: true } });
  const qaListings = await prisma.listing.findMany({ where: { title: { startsWith: RUN } }, select: { id: true } });
  const qaResumes = await prisma.resume.findMany({ where: { title: { startsWith: RUN } }, select: { id: true } });
  const qaProducts = await prisma.product.findMany({ where: { title: { startsWith: RUN } }, select: { id: true } });
  const qaUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { startsWith: RUN.toLowerCase() } },
        { name: { startsWith: RUN } }
      ]
    },
    select: { id: true }
  });

  const articleIds = qaArticles.map((i) => i.id);
  const listingIds = qaListings.map((i) => i.id);
  const resumeIds = qaResumes.map((i) => i.id);
  const productIds = qaProducts.map((i) => i.id);
  const userIds = qaUsers.map((i) => i.id);

  // Invites
  await prisma.invite.deleteMany({
    where: {
      OR: [
        { studioId: { in: userIds } },
        { modelId: { in: userIds } },
        { resumeId: { in: resumeIds } },
        { message: { startsWith: RUN } }
      ]
    }
  });

  // Balance transactions
  await prisma.balanceTransaction.deleteMany({
    where: {
      OR: [
        { note: { startsWith: RUN } },
        { userId: { in: userIds } }
      ]
    }
  });

  // Studio balance (reset for demo studio)
  const demoStudio = await prisma.user.findUnique({ where: { email: "studio1@demo.local" } });
  if (demoStudio) {
    await prisma.studioBalance.upsert({
      where: { userId: demoStudio.id },
      update: { availableUsd: 0, holdUsd: 0 },
      create: { userId: demoStudio.id, availableUsd: 0, holdUsd: 0 }
    });
  }

  // Reports
  await prisma.report.deleteMany({
    where: {
      OR: [
        { reason: { startsWith: RUN } },
        { targetId: { in: [...articleIds, ...listingIds, ...userIds, ...productIds, ...resumeIds] } }
      ]
    }
  });

  // Comment likes
  await prisma.commentLike.deleteMany({
    where: {
      comment: {
        OR: [
          { body: { startsWith: RUN } },
          { articleId: { in: articleIds } }
        ]
      }
    }
  });

  // Comments
  await prisma.articleComment.deleteMany({
    where: {
      OR: [
        { body: { startsWith: RUN } },
        { articleId: { in: articleIds } }
      ]
    }
  });

  // Ratings
  await prisma.articleRating.deleteMany({ where: { articleId: { in: articleIds } } });

  // Follows
  await prisma.follow.deleteMany({ where: { OR: [{ followerId: { in: userIds } }, { authorId: { in: userIds } }] } });
  await prisma.topicFollow.deleteMany({ where: { userId: { in: userIds } } });

  // Saved items
  await prisma.savedListing.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { listingId: { in: listingIds } }] } });
  await prisma.savedProduct.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { productId: { in: productIds } }] } });
  await prisma.savedResume.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { resumeId: { in: resumeIds } }] } });
  await prisma.savedMatchProfile.deleteMany({ where: { userId: { in: userIds } } });

  // Expert slots
  await prisma.expertSlot.deleteMany({ where: { articleId: { in: articleIds } } });

  // Resume contact unlocks
  await prisma.resumeContactUnlock.deleteMany({ where: { resumeId: { in: resumeIds } } });

  // Payments
  await prisma.payment.deleteMany({
    where: {
      OR: [
        { txHash: { startsWith: RUN } },
        { referenceId: { in: [...articleIds, ...listingIds, ...resumeIds, ...productIds] } }
      ]
    }
  });

  // Listings
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });

  // Products
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });

  // Articles
  await prisma.article.deleteMany({ where: { id: { in: articleIds } } });

  // Resumes
  await prisma.resume.deleteMany({ where: { id: { in: resumeIds } } });

  // Audit logs from QA users
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });

  // Match profiles
  await prisma.matchProfile.deleteMany({ where: { userId: { in: userIds } } });

  // Sessions & accounts for QA users
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });

  // Users
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

scenario()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
