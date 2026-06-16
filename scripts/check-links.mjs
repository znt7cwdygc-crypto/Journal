const BASE = process.env.BASE_URL || "http://localhost:3000";
const COOKIE = process.env.CITY_COOKIE || "we_city=moscow";
const START_PAGES = [
  "/",
  "/select-city",
  "/articles",
  "/articles?topic=%D0%94%D0%B5%D0%BD%D1%8C%D0%B3%D0%B8",
  "/guides/rabota-webcam-bez-opyta",
  "/guides/kak-stat-webcam-modelyu",
  "/guides/skolko-zarabatyvaet-webcam-model",
  "/guides/bezopasnost-webcam-modeli",
  "/authors",
  "/vacancies",
  "/vacancies/webcam-model",
  "/vacancies/operator",
  "/vacancies/remote",
  "/services",
  "/services/obs",
  "/services/legal",
  "/services/security",
  "/services/coaching",
  "/resumes",
  "/resumes/models",
  "/resumes/operators",
  "/links",
  "/search?q=%D1%81%D1%82%D1%83%D0%B4%D0%B8%D1%8F",
  "/auth/signin",
  "/auth/signup",
  "/cabinet"
];

const LINK_RE = /href="(\/[^"#]*)"/g;
const EXCLUDE_PREFIXES = ["/_next/"];
const ALLOWED_STATUSES = new Set([200, 301, 302, 303, 307, 308]);

function shouldCheck(link) {
  return !EXCLUDE_PREFIXES.some((prefix) => link.startsWith(prefix));
}

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: COOKIE },
    redirect: "follow"
  });
  return await res.text();
}

async function headStatus(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: COOKIE },
    redirect: "manual"
  });
  return res.status;
}

async function main() {
  const links = new Set(START_PAGES);

  for (const page of START_PAGES) {
    const html = await fetchText(page);
    let match;
    while ((match = LINK_RE.exec(html)) !== null) {
      const link = match[1];
      if (shouldCheck(link)) links.add(link);
    }
  }

  const sorted = [...links].sort();
  const broken = [];

  for (const link of sorted) {
    const status = await headStatus(link);
    const ok = ALLOWED_STATUSES.has(status);
    const line = `${ok ? "OK  " : "ERR "} ${String(status).padEnd(3)} ${link}`;
    console.log(line);
    if (!ok) broken.push({ link, status });
  }

  if (broken.length > 0) {
    console.error(`\nBroken links: ${broken.length}`);
    process.exit(1);
  }

  console.log(`\nChecked links: ${sorted.length}. Broken: 0.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
