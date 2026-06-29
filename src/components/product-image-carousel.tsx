"use client";

import { useState } from "react";

export function ProductImageCarousel({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <img
        className="mt-5 aspect-[4/3] w-full rounded-lg object-cover"
        src={images[0]}
        alt={title}
      />
    );
  }

  return (
    <div className="mt-5">
      <div className="relative overflow-hidden rounded-lg">
        <img
          className="aspect-[4/3] w-full object-cover"
          src={images[active]}
          alt={`${title} — фото ${active + 1}`}
        />
        {/* Prev / Next buttons */}
        <button
          type="button"
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
          onClick={() => setActive((prev) => (prev - 1 + images.length) % images.length)}
          aria-label="Предыдущее фото"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
          onClick={() => setActive((prev) => (prev + 1) % images.length)}
          aria-label="Следующее фото"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        {/* Dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`h-2 w-2 rounded-full transition ${i === active ? "bg-white" : "bg-white/50"}`}
              onClick={() => setActive(i)}
              aria-label={`Фото ${i + 1}`}
            />
          ))}
        </div>
      </div>
      {/* Thumbnails */}
      <div className="mt-2 flex gap-2">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition ${i === active ? "border-[#ff4d2e]" : "border-transparent opacity-70 hover:opacity-100"}`}
            onClick={() => setActive(i)}
          >
            <img className="h-full w-full object-cover" src={src} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
