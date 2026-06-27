import type { Metadata } from "next";
import { Fragment } from "react";
import { AdBlock } from "@/components/ad-block";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Полезные ссылки",
  description: "Подборка полезных инструментов и ресурсов для авторов и участников MyCamDesk.",
  alternates: { canonical: "/links" }
};

export default async function UsefulLinksPage() {
  const links = await prisma.usefulLink.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <div className="space-y-6">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Полезные ссылки",
        "description": "Подборка полезных инструментов и ресурсов для авторов и участников MyCamDesk.",
        "url": siteUrl("/links").toString(),
        "isPartOf": { "@type": "WebSite", "name": "MyCamDesk", "url": siteUrl("/").toString() }
      }) }} />
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">Справка</p>
        <h1 className="mt-1 text-2xl font-semibold">Полезные ссылки</h1>
        <p className="mt-2 text-sm text-zinc-600">Инструменты, платформы и ресурсы для работы в вебкам-индустрии и на контент-платформах.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((item, index) => (
          <Fragment key={item.url}>
            {index === 1 && <AdBlock placement="links" variant="card" />}
            <a href={item.url} target="_blank" rel="noreferrer" className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">{item.topic}</p>
              <p className="mt-1 text-base font-semibold text-ink">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.description}</p>
              <p className="mt-3 text-xs font-medium text-accent">{item.url.replace("https://", "").replace(/\/$/, "")}</p>
            </a>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
