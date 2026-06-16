import Link from "next/link";
import { seoLandings } from "@/lib/seo-landings";
import { expertAuthors, topicNav } from "@/lib/ugc-demo";

export function ShellRail() {
  const popular = seoLandings.filter((landing) =>
    [
      "/guides/rabota-webcam-bez-opyta",
      "/vacancies/webcam-model",
      "/vacancies/operator",
      "/services/security",
      "/resumes/models"
    ].includes(landing.path)
  );

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-20 space-y-3">
        <section className="border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold">Темы</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {topicNav.map((topic, index) => (
              <Link
                key={topic}
                className={`rounded-full px-3 py-1 font-medium ${
                  index % 3 === 0
                    ? "bg-red-50 text-hot hover:bg-red-100"
                    : index % 3 === 1
                      ? "bg-yellow-50 text-amber-800 hover:bg-yellow-100"
                      : "bg-sky-50 text-sky-700 hover:bg-sky-100"
                }`}
                href={`/articles?topic=${encodeURIComponent(topic)}`}
              >
                {topic}
              </Link>
            ))}
          </div>
        </section>
        <section className="border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold">Популярные запросы</p>
          <div className="mt-3 space-y-2">
            {popular.map((landing) => (
              <Link key={landing.path} href={landing.path} className="block rounded-lg border border-zinc-100 px-3 py-2 text-xs leading-5 text-zinc-700 hover:border-hot hover:text-hot">
                {landing.title}
              </Link>
            ))}
          </div>
        </section>
        <section className="border border-zinc-200 bg-white p-4">
          <p className="text-sm font-semibold">Авторы</p>
          <div className="mt-3 space-y-3">
            {expertAuthors.map(([name, role, count]) => (
              <Link key={name} href="/authors" className="block border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium">{name}</p>
                <p className="mt-1 text-xs text-zinc-500">{role}</p>
                <p className="mt-1 text-xs text-accent">{count}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
