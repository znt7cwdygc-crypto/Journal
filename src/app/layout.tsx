import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { DesignSystemStyles } from "@/components/design-system-styles";
import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ShellNav } from "@/components/shell-nav";
import { ShellRail } from "@/components/shell-rail";
import { siteDescription, siteName, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "MyCamDesk — UGC-медиа о вебкам-индустрии: статьи, вакансии, резюме, услуги",
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  applicationName: siteName,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" }
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/favicon.svg" }],
  },
  manifest: "/manifest.json",
  alternates: {},
  verification: {
    yandex: "baa8aa531ed4c162"
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName,
    title: siteName,
    description: siteDescription,
    url: "/"
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-5JBDX2SG');`}
        </Script>
        <Script id="ym-init" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110404557', 'ym');
          ym(110404557, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5JBDX2SG"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/110404557" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
        <DesignSystemStyles />
        <Header />
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-3 pb-24 pt-3 sm:px-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:pb-4 lg:pt-4 xl:grid-cols-[230px_minmax(0,1fr)_280px]">
          <ShellNav />
          <main className="min-w-0">{children}</main>
          <ShellRail />
        </div>
        <MobileBottomNav />
      </body>
    </html>
  );
}
