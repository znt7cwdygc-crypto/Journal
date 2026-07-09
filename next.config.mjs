/** @type {import('next').NextConfig} */
const devConnectSrc = process.env.NODE_ENV === "development" ? " ws://localhost:3000 ws://127.0.0.1:3000" : "";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://mc.yandex.ru${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://mc.yandex.ru${devConnectSrc}`,
  "frame-src https://www.googletagmanager.com",
  "font-src 'self' data:"
].join("; ");

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
const serverActionOrigins = ["localhost:3000", "localhost:3001", ...(siteOrigin ? [siteOrigin, `dev.${siteOrigin}`] : [])];

const guideSlugRedirects = [
  "vebcam-model-chto-eto-za-rabota",
  "kak-stat-vebcam-modelyu-s-nulya",
  "vebcam-rabota-udalenno-na-domu",
  "vebcam-model-zakonno-ili-net",
  "kak-vybrat-vebcam-studiyu",
  "kakoy-procent-u-vebcam-modeli-v-studii",
  "dogovor-s-vebcam-studiey-chto-proverit",
  "operator-vebcam-chto-delaet",
  "administrator-vebcam-studii-obyazannosti-zarplata",
  "nastroyka-obs-dlya-vebcam",
  "kalkulyator-zarabotka-vebcam-modeli-2026",
  "skolko-zarabatyvaet-vebcam-model-v-rossii-i-sng"
].map((old) => ({
  source: `/guides/${old}`,
  destination: `/guides/${old.replace(/vebcam/g, "webcam")}`,
  permanent: true
}));

// Гайды первых двух поколений (до текущей v2-структуры) были удалены при пересидах
// без редиректов. Эти URL успели попасть в индекс Яндекса/Google — отдают 404.
// Ведём на ближайший по теме актуальный гайд.
const legacyGuideRedirects = [
  ["rabota-webcam-bez-opyta", "kak-stat-webcam-modelyu-s-nulya"],
  ["kak-stat-webcam-modelyu", "kak-stat-webcam-modelyu-s-nulya"],
  ["kak-nachat-vebcam-bez-opyta", "kak-stat-webcam-modelyu-s-nulya"],
  ["skolko-zarabatyvaet-webcam-model", "skolko-zarabatyvaet-webcam-model-v-rossii-i-sng"],
  ["skolko-zarabatyvaet-vebcam-model", "skolko-zarabatyvaet-webcam-model-v-rossii-i-sng"],
  ["bezopasnost-webcam-modeli", "webcam-model-zakonno-ili-net"],
  ["bezopasnost-vebcam-modeli", "webcam-model-zakonno-ili-net"],
  ["kak-studii-nayti-administratora", "administrator-webcam-studii-obyazannosti-zarplata"],
  ["kak-nayti-operatora-dlya-vebcam", "operator-webcam-chto-delaet"],
  ["oborudovanie-dlya-vebcam-strima", "nastroyka-obs-dlya-webcam"]
].map(([old, next]) => ({
  source: `/guides/${old}`,
  destination: `/guides/${next}`,
  permanent: true
}));

// Не гайд, а анкета резюме — редирект в другой раздел на живую страницу.
const legacyCrossSectionRedirects = [
  { source: "/guides/kak-sostavit-rezyume-modeli", destination: "/resumes", permanent: true }
];

// Пустые SEO-хабы /services, /vacancies, /resumes с фильтром по slug — контент дублировал
// то, что теперь полноценно покрыто гайдами, а под фильтром реальных объявлений/резюме
// пока нет. Ведём на живой раздел или ближайший по теме гайд, а не оставляем тонкий дубль.
const thinHubRedirects = [
  { source: "/services/obs", destination: "/guides/nastroyka-obs-dlya-webcam" },
  { source: "/services/legal", destination: "/services" },
  { source: "/services/security", destination: "/guides/chto-delat-esli-sliv-kontenta-s-webcam-sayta" },
  { source: "/services/coaching", destination: "/services" },
  { source: "/vacancies/webcam-model", destination: "/vacancies" },
  { source: "/vacancies/operator", destination: "/vacancies" },
  { source: "/vacancies/remote", destination: "/vacancies" },
  { source: "/resumes/models", destination: "/resumes" },
  { source: "/resumes/operators", destination: "/resumes" }
].map((r) => ({ ...r, permanent: true }));

const articleSlugRedirects = [
  "9ve2g8pf-ya-stala-vebkam-modelyu-chto-okazalos-ne-tak-kak-ya-ozhidala",
  "1dsjskt2-kak-ya-nachinala-vebkam-doma-bez-opyta",
  "7bxbi4yw-odin-den-iz-zhizni-operatora-vebkam",
  "nlia3urr-vebkam-rabota-otzyvy-plyusy-minusy-i-realnye-riski"
].map((old) => ({
  source: `/articles/${old}`,
  destination: `/articles/${old.replace(/vebkam/g, "webcam")}`,
  permanent: true
}));

const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins
    }
  },
  async redirects() {
    return [...guideSlugRedirects, ...legacyGuideRedirects, ...legacyCrossSectionRedirects, ...thinHubRedirects, ...articleSlugRedirects];
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cache-Control", value: "no-store, must-revalidate" }
        ]
      }
    ];
  }
};

export default nextConfig;
