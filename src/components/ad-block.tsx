import { getAdvertisementForPlacement, type AdPlacement } from "@/lib/ads";

export async function AdBlock({ placement }: { placement: AdPlacement }) {
  const ad = await getAdvertisementForPlacement(placement);
  if (!ad) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <a
        className="grid gap-3 p-3 transition hover:border-hot hover:bg-zinc-50 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center"
        href={`/ads/${ad.id}/click`}
        rel="sponsored noopener noreferrer"
        target="_blank"
      >
        <img className="aspect-[16/9] w-full rounded-md bg-zinc-100 object-cover sm:h-20" src={ad.imageUrl} alt={ad.title} loading="lazy" />
        <span className="min-w-0">
          <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
            Реклама
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-ink">{ad.title}</span>
          {ad.description && <span className="mt-1 block line-clamp-2 text-xs leading-5 text-zinc-600">{ad.description}</span>}
        </span>
      </a>
    </section>
  );
}
