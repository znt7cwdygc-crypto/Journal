"use client";

import { useRef, useState } from "react";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function uploadToServer(file: File, seoContext: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("seoContext", seoContext);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url as string;
}

function validateFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Выберите изображение (JPG, PNG, WebP)";
  if (file.size > MAX_FILE_BYTES) return "Файл слишком большой (макс. 5 МБ)";
  return null;
}

export function SingleImageUpload({
  name,
  initialUrl,
  seoContext,
  label,
  rounded = "rounded-lg"
}: {
  name: string;
  initialUrl?: string | null;
  seoContext: string;
  label: string;
  rounded?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [url, setUrl] = useState(initialUrl || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setUploading(true);
    const tempUrl = URL.createObjectURL(file);
    setUrl(tempUrl);
    try {
      const uploaded = await uploadToServer(file, seoContext);
      setUrl(uploaded);
    } catch {
      setUrl(initialUrl || "");
      setError("Не удалось загрузить изображение, попробуйте ещё раз");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(tempUrl);
    }
  }

  return (
    <div>
      <span className="form-label">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <div className={`relative h-16 w-16 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-50 ${rounded}`}>
          {url ? (
            <img className={`h-full w-full object-cover ${uploading ? "opacity-40" : ""}`} src={url} alt="" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">нет</span>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="inline-flex w-fit rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {url ? "Заменить" : "Загрузить"}
          </button>
          {url && (
            <button
              type="button"
              className="w-fit text-[11px] text-zinc-400 hover:text-red-600"
              onClick={() => setUrl("")}
              disabled={uploading}
            >
              Удалить
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <input type="hidden" name={name} value={url} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

type PhotoItem = { url: string; uploading?: boolean; tempId?: string };

export function MultiImageUpload({
  name,
  initialUrls = [],
  max = 6,
  seoContext,
  label
}: {
  name: string;
  initialUrls?: string[];
  max?: number;
  seoContext: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>(initialUrls.filter(Boolean).map((url) => ({ url })));
  const [error, setError] = useState("");
  const isUploading = photos.some((p) => p.uploading);

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (photos.length >= max) return;
    setError("");

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const tempUrl = URL.createObjectURL(file);
    setPhotos((prev) => [...prev, { url: tempUrl, uploading: true, tempId }]);

    try {
      const uploaded = await uploadToServer(file, seoContext);
      setPhotos((prev) => prev.map((p) => (p.tempId === tempId ? { url: uploaded, uploading: false } : p)));
    } catch {
      setPhotos((prev) => prev.filter((p) => p.tempId !== tempId));
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
    <div>
      <span className="form-label">{label}</span>
      <div className="mt-1 flex flex-wrap gap-2">
        {readyPhotos.map((photo, i) => (
          <input key={`hidden-${photo.url}`} type="hidden" name={name} value={photo.url} />
        ))}
        {photos.map((photo, i) => (
          <div key={photo.tempId || photo.url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
            <img className={`h-full w-full object-cover ${photo.uploading ? "opacity-40" : ""}`} src={photo.url} alt="" />
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
        {photos.length < max && (
          <button
            type="button"
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-zinc-400 transition hover:border-hot hover:text-hot"
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
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-zinc-400">До {max} фото &bull; JPG, PNG, WebP до 5 МБ</p>
    </div>
  );
}
