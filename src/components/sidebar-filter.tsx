import Link from "next/link";

export function SidebarFilter({
  title,
  basePath,
  topics,
  activeTopic,
  counts
}: {
  title: string;
  basePath: string;
  topics: string[];
  activeTopic: string;
  counts: Record<string, number>;
}) {
  return (
    <aside className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold">{title}</p>
      <nav className="mt-3 space-y-1 text-sm">
        <Link
          href={basePath}
          className={`block rounded px-2 py-1 ${activeTopic === "all" ? "bg-ink text-white" : "hover:bg-stone-100"}`}
        >
          Все ({Object.values(counts).reduce((a, b) => a + b, 0)})
        </Link>
        {topics.map((topic) => (
          <Link
            key={topic}
            href={`${basePath}?topic=${encodeURIComponent(topic)}`}
            className={`block rounded px-2 py-1 ${activeTopic === topic ? "bg-ink text-white" : "hover:bg-stone-100"}`}
          >
            {topic} ({counts[topic] || 0})
          </Link>
        ))}
      </nav>
    </aside>
  );
}
