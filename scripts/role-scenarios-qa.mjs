const BASE = process.env.BASE_URL || "http://localhost:3000";
const RUN = `QA-${Date.now()}`;
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

class Client {
  constructor(label) {
    this.label = label;
    this.cookies = new Map([["we_city", "moscow"]]);
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }

  storeCookies(headers) {
    const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const index = pair.indexOf("=");
      if (index > 0) this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }

  async request(path, init = {}) {
    const res = await fetch(`${BASE}${path}`, {
      redirect: "manual",
      ...init,
      headers: {
        cookie: this.cookieHeader(),
        ...(init.headers || {})
      }
    });
    this.storeCookies(res.headers);
    return res;
  }

  async get(path) {
    let res = await this.request(path);
    for (let i = 0; i < 5 && [301, 302, 303, 307, 308].includes(res.status); i += 1) {
      const location = res.headers.get("location");
      if (!location) break;
      const url = new URL(location, BASE);
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
    for (const [key, value] of Object.entries(fields)) form.append(key, String(value));
    const res = await this.request(path, { method: "POST", body: form });
    return res.status;
  }

  async submitAndFollow(path, actionId, fields) {
    const form = new FormData();
    form.append(`$ACTION_ID_${actionId}`, "");
    for (const [key, value] of Object.entries(fields)) form.append(key, String(value));

    let res = await this.request(path, { method: "POST", body: form });
    let finalPath = path;
    for (let i = 0; i < 5 && [301, 302, 303, 307, 308].includes(res.status); i += 1) {
      const location = res.headers.get("location");
      if (!location) break;
      const url = new URL(location, BASE);
      finalPath = `${url.pathname}${url.search}`;
      res = await this.request(finalPath);
    }

    const responseText = await res.text();
    return { path: finalPath, status: res.status, h1: h1(responseText), ok: res.status === 200 && !textHasError(responseText), text: responseText };
  }
}

function textHasError(text) {
  return /Server Error|Application error|Unhandled Runtime Error|CallbackRouteError|TypeError|ReferenceError/i.test(text);
}

function text(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function h1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? text(match[1]) : "NO_H1";
}

function actionIdForForm(html, needle) {
  const forms = html.match(/<form[\s\S]*?<\/form>/g) || [];
  const form = forms.find((candidate) => text(candidate).includes(needle) || candidate.includes(needle));
  if (!form) throw new Error(`Form not found: ${needle}`);
  const match = form.match(/name="\$ACTION_ID_([^"]+)"/);
  if (!match) throw new Error(`Action id not found for form: ${needle}`);
  return match[1];
}

function actionIdForRawForm(html, rawNeedle) {
  const forms = html.match(/<form[\s\S]*?<\/form>/g) || [];
  const form = forms.find((candidate) => candidate.includes(rawNeedle));
  if (!form) throw new Error(`Form not found by raw marker: ${rawNeedle}`);
  const match = form.match(/name="\$ACTION_ID_([^"]+)"/);
  if (!match) throw new Error(`Action id not found for raw marker: ${rawNeedle}`);
  return match[1];
}

function actionIdForNearestForm(html, marker) {
  const index = html.indexOf(marker);
  if (index < 0) throw new Error(`Marker not found: ${marker}`);
  const before = html.slice(0, index);
  const formStart = before.lastIndexOf("<form");
  const formEnd = html.indexOf("</form>", index);
  if (formStart < 0 || formEnd < 0) throw new Error(`Nearest form not found: ${marker}`);
  const form = html.slice(formStart, formEnd + 7);
  const match = form.match(/name="\$ACTION_ID_([^"]+)"/);
  if (!match) throw new Error(`Action id not found near: ${marker}`);
  return match[1];
}

function firstHref(html, prefix) {
  const match = html.match(new RegExp(`href="(${prefix.replace("/", "\\/")}[^"]*)"`));
  if (!match) throw new Error(`Href not found: ${prefix}`);
  return match[1].replaceAll("&amp;", "&");
}

function hiddenValueNear(html, marker, inputName) {
  const index = html.indexOf(marker);
  if (index < 0) throw new Error(`Marker not found: ${marker}`);
  const before = html.slice(0, index);
  const formStart = before.lastIndexOf("<form");
  const formEnd = html.indexOf("</form>", index);
  const form = html.slice(formStart, formEnd + 7);
  const match = form.match(new RegExp(`name="${inputName}" value="([^"]+)"`));
  if (!match) throw new Error(`Hidden ${inputName} not found near ${marker}`);
  return match[1];
}

function hiddenValueAfter(html, marker, inputName) {
  const index = html.indexOf(marker);
  if (index < 0) throw new Error(`Marker not found: ${marker}`);
  const after = html.slice(index);
  const formStart = after.indexOf("<form");
  const formEnd = after.indexOf("</form>", formStart);
  if (formStart < 0 || formEnd < 0) throw new Error(`Form after marker not found: ${marker}`);
  const form = after.slice(formStart, formEnd + 7);
  const match = form.match(new RegExp(`name="${inputName}" value="([^"]+)"`));
  if (!match) throw new Error(`Hidden ${inputName} not found after ${marker}`);
  return match[1];
}

async function expectPage(client, path, expected) {
  const page = await client.get(path);
  const ok = page.status === 200 && !textHasError(page.text) && (!expected || text(page.text).includes(expected));
  return { path, status: page.status, h1: h1(page.text), ok, expected };
}

async function scenario() {
  const results = [];
  let page;
  await ensureFixture();

  const guest = new Client("guest");
  for (const path of ["/", "/articles", "/articles?topic=Деньги", "/authors", "/search?q=студия", "/vacancies", "/services", "/resumes", "/links", "/auth/signin", "/auth/signup"]) {
    results.push({ role: "guest", step: `open ${path}`, ...(await expectPage(guest, path)) });
  }
  const articlesPage = await guest.get("/articles");
  const articleHref = firstHref(articlesPage.text, "/articles/");
  const profileHref = firstHref(await (await guest.get(articleHref)).text, "/profiles/");
  results.push({ role: "guest", step: "read article", ...(await expectPage(guest, articleHref)) });
  results.push({ role: "guest", step: "open author profile", ...(await expectPage(guest, profileHref)) });
  const guestCabinet = await guest.get("/cabinet");
  results.push({ role: "guest", step: "closed cabinet redirects to sign in", path: "/cabinet", status: guestCabinet.status, h1: h1(guestCabinet.text), ok: text(guestCabinet.text).includes("Вход") });

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
  results.push({ role: "guest", step: "register new model", ...(await expectPage(signupModel, "/cabinet", "Резюме (бесплатно")) });
  page = await signupModel.get("/cabinet");
  await signupModel.submit("/cabinet", actionIdForForm(page.text, "Сохранить публичный профиль"), {
    name: `${RUN} публичный автор`,
    image: "https://example.com/qa-avatar.png",
    profileBio: `${RUN} описание публичного профиля`
  });
  page = await signupModel.get("/cabinet");
  results.push({
    role: "guest",
    step: "server draft controls visible",
    path: "/cabinet",
    status: page.status,
    h1: h1(page.text),
    ok: text(page.text).includes("Сохранить черновик") && text(page.text).includes("Черновик можно сохранить на сервере")
  });
  page = await signupModel.get("/cabinet");
  const profileBlog = await signupModel.submitAndFollow("/cabinet", actionIdForForm(page.text, "Опубликовать в блог"), {
    title: `${RUN} блог с публичным профилем`,
    summary: "Проверка отображения имени, аватара и описания автора.",
    format: "Личная история",
    topic: "Истории",
    coverImage: "https://example.com/qa-cover.jpg",
    body: "Новый пользователь проверяет, что публичный профиль виден из статьи, авторов и страницы профиля."
  });
  const publicProfileHref = firstHref(profileBlog.text, "/profiles/");
  results.push({ role: "guest", step: "public profile renders edited bio", ...(await expectPage(signupModel, publicProfileHref, `${RUN} описание публичного профиля`)) });
  results.push({ role: "guest", step: "edited author appears in authors", ...(await expectPage(signupModel, "/authors", `${RUN} публичный автор`)) });

  const signupExpert = new Client("signup-expert");
  page = await signupExpert.get("/auth/signup");
  await signupExpert.submit("/auth/signup", actionIdForForm(page.text, "Создать аккаунт"), {
    name: `${RUN} new expert`,
    email: `${RUN.toLowerCase()}-signup-expert@example.local`,
    password: "qa12345",
    accountMode: "PROVIDER",
    profileKind: "EXPERT",
    adult: "on"
  });
  results.push({ role: "guest", step: "register new expert", ...(await expectPage(signupExpert, "/cabinet", "Опубликовать статью")) });

  const model = new Client("model");
  results.push({ role: "model", step: "login", status: await model.login("model1@demo.local", "demo12345"), ok: true });
  page = await model.get("/cabinet");
  results.push({ role: "model", step: "cabinet has resume form", path: "/cabinet", status: page.status, h1: h1(page.text), ok: text(page.text).includes("Резюме (бесплатно") && !text(page.text).includes("Подать статью") });
  const blogRedirect = await model.submitAndFollow("/cabinet", actionIdForForm(page.text, "Опубликовать в блог"), {
    title: `${RUN} личный блог модели`,
    summary: "Личная заметка модели без платного размещения.",
    format: "Личная история",
    topic: "Истории",
    body: "Модель проверяет, что обычный пользователь может вести блог и оставаться в режиме потребителя услуг."
  });
  results.push({ role: "model", step: "personal blog redirect opens", path: blogRedirect.path, status: blogRedirect.status, h1: blogRedirect.h1, ok: blogRedirect.ok && text(blogRedirect.text).includes(`${RUN} личный блог модели`) });
  results.push({ role: "model", step: "personal blog appears in articles", ...(await expectPage(model, "/articles", `${RUN} личный блог модели`)) });
  page = await model.get("/cabinet");
  await model.submit("/cabinet", actionIdForForm(page.text, "Сохранить резюме"), {
    title: `${RUN} модель: резюме`,
    roleGoal: "Модель",
    city: "Москва",
    experienceMonths: 7,
    contactEmail: "model1@demo.local",
    contactTelegram: `@${RUN.toLowerCase()}_model`,
    bio: "Ищу студию с прозрачными выплатами, готова к обучению и стабильному графику."
  });
  results.push({ role: "model", step: "resume appears in resumes", ...(await expectPage(model, "/resumes", `${RUN} модель: резюме`)) });
  const reactedArticleId = articleHref.split("/").pop();
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Нравится"), { articleId: reactedArticleId, value: 5 });
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Полезно"), { articleId: reactedArticleId, value: 4 });
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Добавить комментарий"), { articleId: reactedArticleId, body: `${RUN} комментарий модели` });
  page = await model.get(articleHref);
  const parentId = hiddenValueNear(page.text, "Ответить", "parentId");
  await model.submit(articleHref, actionIdForForm(page.text, "Ответить"), { articleId: reactedArticleId, parentId, body: `${RUN} ответ модели` });
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Лайк"), { commentId: hiddenValueNear(page.text, "Лайк", "commentId") });
  page = await model.get(articleHref);
  await model.submit(articleHref, actionIdForForm(page.text, "Пожаловаться"), { targetType: "ARTICLE", targetId: reactedArticleId, reason: `${RUN} жалоба на статью` });
  page = await model.get(articleHref);
  const reactedArticle = await prisma.article.findUnique({
    where: { id: reactedArticleId },
    include: { ratings: true, comments: true }
  });
  results.push({
    role: "model",
    step: "useful/comment/report reactions persisted",
    path: articleHref,
    status: reactedArticle ? 200 : 404,
    ok:
      !!reactedArticle &&
      reactedArticle.ratings.some((rating) => rating.userId && rating.value === 4) &&
      reactedArticle.comments.some((comment) => comment.body === `${RUN} комментарий модели`) &&
      reactedArticle.comments.some((comment) => comment.body === `${RUN} ответ модели`)
  });
  results.push({ role: "model", step: "reaction labels render", ...(await expectPage(model, articleHref, "Полезно")) });
  results.push({ role: "model", step: "share link renders", ...(await expectPage(model, articleHref, "Ссылка на статью")) });
  page = await model.get("/vacancies");
  await model.submit("/vacancies", actionIdForForm(page.text, "Откликнуться"), { listingId: hiddenValueNear(page.text, "Откликнуться", "listingId") });
  page = await model.get("/vacancies");
  await model.submit("/vacancies", actionIdForForm(page.text, "Сохранить"), { listingId: hiddenValueNear(page.text, "Сохранить", "listingId") });
  const listingHref = firstHref(page.text, "/listings/");
  results.push({ role: "model", step: "respond to vacancy", ...(await expectPage(model, "/vacancies", "Отклики:")) });
  results.push({ role: "model", step: "listing detail opens", ...(await expectPage(model, listingHref, "Сохранить")) });

  const studio = new Client("studio");
  results.push({ role: "studio", step: "login", status: await studio.login("studio1@demo.local", "demo12345"), ok: true });
  page = await studio.get("/cabinet");
  results.push({ role: "studio", step: "free provider forms visible", path: "/cabinet", status: page.status, h1: h1(page.text), ok: text(page.text).includes("бесплатно сейчас") && text(page.text).includes("Опубликовать размещение") });
  const studioArticle = await studio.submitAndFollow("/cabinet", actionIdForForm(page.text, "Опубликовать статью"), {
    title: `${RUN} статья студии`,
    summary: "Проверочная статья от студии.",
    topic: "Студии",
    geoCode: "moscow,ru",
    specialization: "Онбординг",
    contact: "@qa_studio",
    vacanciesUrl: "/vacancies",
    body: "Студия проверяет бесплатную публикацию экспертного материала без оплаты."
  });
  results.push({ role: "studio", step: "free article opens immediately", path: studioArticle.path, status: studioArticle.status, h1: studioArticle.h1, ok: studioArticle.ok && text(studioArticle.text).includes(`${RUN} статья студии`) });
  page = await studio.get("/cabinet");
  await studio.submit("/cabinet", actionIdForRawForm(page.text, 'name="kind"'), {
    kind: "VACANCY",
    employmentType: "REMOTE",
    title: `${RUN} вакансия студии`,
    city: "Москва",
    geoCode: "moscow,ru",
    contact: "@qa_studio_jobs",
    description: "Проверочная вакансия для полного сценария студии."
  });
  page = await studio.get("/cabinet");
  await studio.submit("/cabinet", actionIdForRawForm(page.text, 'name="kind"'), {
    kind: "SERVICE",
    employmentType: "REMOTE",
    title: `${RUN} услуга студии`,
    city: "Москва",
    geoCode: "moscow,ru",
    contact: "@qa_studio_service",
    description: "Проверочная услуга студии."
  });
  results.push({ role: "studio", step: "resume contacts visible for signed user", ...(await expectPage(studio, "/resumes", "@qa_model2")) });
  results.push({ role: "studio", step: "free vacancy visible immediately", ...(await expectPage(studio, "/vacancies", `${RUN} вакансия студии`)) });
  results.push({ role: "studio", step: "free service visible immediately", ...(await expectPage(studio, "/services", `${RUN} услуга студии`)) });
  results.push({ role: "studio", step: "admin denied", ...(await expectPage(studio, "/admin", "Истории, разборы")) });

  const expert = new Client("expert");
  results.push({ role: "expert", step: "login", status: await expert.login("expert1@demo.local", "demo12345"), ok: true });
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
  results.push({ role: "expert", step: "free expert article visible", ...(await expectPage(expert, "/articles", `${RUN} статья эксперта`)) });
  results.push({ role: "expert", step: "free expert service visible", ...(await expectPage(expert, "/services", `${RUN} услуга эксперта`)) });
  results.push({ role: "expert", step: "admin denied", ...(await expectPage(expert, "/admin", "Истории, разборы")) });

  const admin = new Client("admin");
  results.push({ role: "admin", step: "login", status: await admin.login("admin@webcamexpert.local", "admin12345"), ok: true });
  page = await admin.get("/admin");
  results.push({ role: "admin", step: "open reports moderation", path: "/admin", status: page.status, h1: h1(page.text), ok: text(page.text).includes("Жалобы и модерация") });
  if (text(page.text).includes(`${RUN} жалоба на статью`)) {
    const reportId = hiddenValueAfter(page.text, `${RUN} жалоба на статью`, "reportId");
    const actionId = actionIdForRawForm(page.text, 'name="decision" value="resolve"');
    await admin.submit("/admin", actionId, { reportId, decision: "resolve" });
  }
  results.push({ role: "admin", step: "resolved report", ...(await expectPage(admin, "/admin", "Админ-панель")) });
  results.push({ role: "guest", step: "free studio article visible", ...(await expectPage(guest, "/articles", `${RUN} статья студии`)) });

  const failures = results.filter((result) => !result.ok);
  for (const result of results) {
    console.log(`${result.ok ? "OK " : "ERR"} [${result.role}] ${result.step} ${result.path || ""} ${result.h1 ? `h1="${result.h1}"` : ""}`);
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

async function ensureFixture() {
  const [studio, expert] = await Promise.all([
    prisma.user.findUnique({ where: { email: "studio1@demo.local" } }),
    prisma.user.findUnique({ where: { email: "expert1@demo.local" } })
  ]);
  if (!studio || !expert) throw new Error("Demo users missing. Run prisma/seed-demo.ts first.");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

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
      lastVisitedAt: now
    }
  });
}

async function cleanupQaRun() {
  const qaArticles = await prisma.article.findMany({ where: { title: { startsWith: RUN } }, select: { id: true } });
  const qaListings = await prisma.listing.findMany({ where: { title: { startsWith: RUN } }, select: { id: true } });
  const qaResumes = await prisma.resume.findMany({ where: { title: { startsWith: RUN } }, select: { id: true } });
  const qaUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { startsWith: RUN.toLowerCase() } },
        { name: { startsWith: RUN } }
      ]
    },
    select: { id: true }
  });

  const articleIds = qaArticles.map((item) => item.id);
  const listingIds = qaListings.map((item) => item.id);
  const resumeIds = qaResumes.map((item) => item.id);
  const userIds = qaUsers.map((item) => item.id);

  await prisma.report.deleteMany({
    where: {
      OR: [
        { reason: { startsWith: RUN } },
        { targetId: { in: articleIds } },
        { targetId: { in: listingIds } },
        { targetId: { in: userIds } }
      ]
    }
  });
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
  await prisma.articleComment.deleteMany({
    where: {
      OR: [
        { body: { startsWith: RUN } },
        { articleId: { in: articleIds } }
      ]
    }
  });
  await prisma.articleRating.deleteMany({ where: { articleId: { in: articleIds } } });
  await prisma.follow.deleteMany({ where: { OR: [{ followerId: { in: userIds } }, { authorId: { in: userIds } }] } });
  await prisma.topicFollow.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.savedListing.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { listingId: { in: listingIds } }] } });
  await prisma.expertSlot.deleteMany({ where: { articleId: { in: articleIds } } });
  await prisma.resumeContactUnlock.deleteMany({ where: { resumeId: { in: resumeIds } } });
  await prisma.payment.deleteMany({
    where: {
      OR: [
        { txHash: { startsWith: RUN } },
        { referenceId: { in: articleIds } },
        { referenceId: { in: listingIds } },
        { referenceId: { in: resumeIds } }
      ]
    }
  });
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.article.deleteMany({ where: { id: { in: articleIds } } });
  await prisma.resume.deleteMany({ where: { id: { in: resumeIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

scenario().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
