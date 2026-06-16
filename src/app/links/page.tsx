import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Полезные ссылки",
  description: "Подборка полезных инструментов и ресурсов для авторов и участников WebcamExpert.",
  alternates: { canonical: "/links" }
};

const links = [
  { title: "Гайд по безопасности моделей", url: "https://www.eff.org", topic: "Безопасность" },
  { title: "OBS Studio", url: "https://obsproject.com", topic: "Технические инструменты" },
  { title: "Canva", url: "https://www.canva.com", topic: "Визуал и оформление" },
  { title: "Notion", url: "https://www.notion.so", topic: "Планирование и контент" },
  { title: "Google Trends", url: "https://trends.google.com", topic: "Аналитика интересов" }
];

export default function UsefulLinksPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Полезные ссылки</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((item) => (
          <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="rounded-xl bg-white p-5 shadow-sm hover:shadow">
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">{item.topic}</p>
            <p className="mt-1 font-medium">{item.title}</p>
            <p className="mt-2 text-sm text-accent">{item.url}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
