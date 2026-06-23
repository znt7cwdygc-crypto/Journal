import { getAdvertisementForPlacement, type AdPlacement } from "@/lib/ads";

export async function AdBlock({ placement, variant = "banner" }: { placement: AdPlacement; variant?: "banner" | "card" }) {
  const ad = await getAdvertisementForPlacement(placement);
  if (!ad) return null;

  if (variant === "card") {
    return (
      <a
        className="relative block min-h-[132px] min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 p-5 shadow-sm transition hover:border-hot hover:shadow"
        href={`/ads/${ad.id}/click`}
        rel="sponsored noopener noreferrer"
        target="_blank"
      >
        <img className="absolute inset-0 h-full w-full object-cover opacity-95" src={ad.imageUrl} alt="" loading="lazy" />
        <span className="relative inline-flex rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
          Реклама
        </span>
        <span className="sr-only">{ad.title}</span>
      </a>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <a
        className="grid gap-4 p-3 transition hover:border-hot hover:bg-zinc-50 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center"
        href={`/ads/${ad.id}/click`}
        rel="sponsored noopener noreferrer"
        target="_blank"
      >
        <span className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-md bg-zinc-950 sm:h-[124px]">
          <img className="h-full w-full object-contain" src={ad.imageUrl} alt={ad.title} loading="lazy" />
        </span>
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
