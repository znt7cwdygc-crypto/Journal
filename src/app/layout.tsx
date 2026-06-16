import type { Metadata } from "next";
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
    default: siteName,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  applicationName: siteName,
  alternates: {
    canonical: "/"
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
      <body>
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
