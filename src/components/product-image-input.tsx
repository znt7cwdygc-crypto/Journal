"use client";

import { useRef, useState } from "react";

type PhotoItem = { url: string; uploading?: boolean };

export function ProductImageInput({
  images = [],
  required,
}: {
  images?: string[];
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>(
    images.filter(Boolean).map((url) => ({ url }))
  );
  const [error, setError] = useState("");

  const isUploading = photos.some((p) => p.uploading);

  async function uploadFile(file: File) {
    if (photos.length >= 3) return;
    if (!file.type.startsWith("image/")) {
      setError("Выберите изображение (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Файл слишком большой (макс. 5 МБ)");
      return;
    }
    setError("");

    const tempUrl = URL.createObjectURL(file);
    const idx = photos.length;
    setPhotos((prev) => [...prev, { url: tempUrl, uploading: true }]);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("seoContext", "product-photo");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setPhotos((prev) =>
        prev.map((p, i) => (i === idx ? { url, uploading: false } : p))
      );
    } catch {
      setPhotos((prev) => prev.filter((_, i) => i !== idx));
      setError("Не удалось загрузить фото, попробуйте ещё раз");
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  }

  function remove(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  const readyPhotos = photos.filter((p) => !p.uploading);

  return (
    <div className="space-y-2">
      {/* Hidden inputs for form submission */}
      {readyPhotos.map((p, i) => (
        <input key={`hidden-${i}`} type="hidden" name="productImages" value={p.url} />
      ))}

      {/* Thumbnails row */}
      <div className="flex gap-2 flex-wrap">
        {photos.map((photo, i) => (
          <div
            key={i}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200"
          >
            <img
              className={`h-full w-full object-cover ${photo.uploading ? "opacity-40" : ""}`}
              src={photo.url}
              alt=""
            />
            {photo.uploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
              </div>
            )}
            {!photo.uploading && (
              <button
                type="button"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-red-600"
                onClick={() => remove(i)}
              >
                &times;
              </button>
            )}
          </div>
        ))}
        {photos.length < 3 && (
          <button
            type="button"
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-zinc-400 transition hover:border-[#ff4d2e] hover:text-[#ff4d2e]"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            <span className="text-2xl leading-none">+</span>
            <span className="mt-0.5 text-[10px]">Фото</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
          e.target.value = "";
        }}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {required && readyPhotos.length === 0 && (
        <input type="hidden" name="_photoRequired" value="" required />
      )}

      <p className="text-xs text-zinc-400">До 3 фото &bull; JPG, PNG, WebP до 5 МБ</p>
    </div>
  );
}
