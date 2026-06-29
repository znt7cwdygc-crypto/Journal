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
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self'${devConnectSrc}`,
  "font-src 'self' data:"
].join("; ");

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : null;
const serverActionOrigins = ["localhost:3000", "localhost:3001", ...(siteOrigin ? [siteOrigin, `dev.${siteOrigin}`] : [])];

const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: serverActionOrigins
    }
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
