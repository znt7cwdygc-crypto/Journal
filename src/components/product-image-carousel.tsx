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
  const [fullscreen, setFullscreen] = useState(false);

  if (images.length === 0) return null;

  const mainImage = (
    <img
      className="max-h-[400px] w-full cursor-zoom-in rounded-lg object-contain bg-zinc-100"
      src={images[active]}
      alt={`${title}${images.length > 1 ? ` — фото ${active + 1}` : ""}`}
      onClick={() => setFullscreen(true)}
    />
  );

  return (
    <>
      <div className="mt-5">
        {images.length === 1 ? (
          mainImage
        ) : (
          <>
            <div className="relative">
              {mainImage}
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                onClick={() => setActive((p) => (p - 1 + images.length) % images.length)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                onClick={() => setActive((p) => (p + 1) % images.length)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button key={i} type="button" className={`h-2 w-2 rounded-full transition ${i === active ? "bg-white" : "bg-white/50"}`} onClick={() => setActive(i)} />
                ))}
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {images.map((src, i) => (
                <button key={i} type="button" className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition ${i === active ? "border-[#ff4d2e]" : "border-transparent opacity-70 hover:opacity-100"}`} onClick={() => setActive(i)}>
                  <img className="h-full w-full object-cover" src={src} alt="" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setFullscreen(false)}>
          <button type="button" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white text-xl hover:bg-white/40" onClick={() => setFullscreen(false)}>✕</button>
          {images.length > 1 && (
            <>
              <button type="button" className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40" onClick={(e) => { e.stopPropagation(); setActive((p) => (p - 1 + images.length) % images.length); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40" onClick={(e) => { e.stopPropagation(); setActive((p) => (p + 1) % images.length); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </>
          )}
          <img className="max-h-[90vh] max-w-[90vw] object-contain" src={images[active]} alt={title} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
