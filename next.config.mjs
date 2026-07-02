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
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com${devConnectSrc}`,
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
    return [...guideSlugRedirects, ...articleSlugRedirects];
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
