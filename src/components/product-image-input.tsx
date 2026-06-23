"use client";

import { useRef, useState } from "react";

export function ProductImageInput({
  imageUrl,
  title,
  required
}: {
  imageUrl?: string | null;
  title?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(imageUrl ?? "");
  const [fileName, setFileName] = useState(imageUrl ? "Текущее фото товара" : "");

  function showPreview(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(String(reader.result ?? ""));
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function clearPreview() {
    setPreview("");
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        className="sr-only"
        id="product-image"
        type="file"
        name="imageFile"
        accept="image/*"
        required={required && !preview}
        onChange={(event) => showPreview(event.currentTarget.files?.[0])}
      />

      {!preview ? (
        <button
          className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition ${
            isDragging ? "border-[#ff4d2e] bg-[#fff1ed]" : "border-zinc-300 bg-white hover:border-[#ff4d2e] hover:bg-[#fff1ed]"
          }`}
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (!file) return;

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            if (inputRef.current) inputRef.current.files = dataTransfer.files;
            showPreview(file);
          }}
        >
          <svg className="mb-2 text-zinc-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.3" />
            <path d="M21 16l-5-5-3 3-2-2-4 4" />
          </svg>
          <span className="text-sm font-semibold leading-5 text-ink">Перетащите фото или нажмите для выбора</span>
          <span className="mt-1 text-xs text-zinc-500">JPG, PNG, WebP или GIF до 350 КБ</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5">
          <img className="h-14 w-14 flex-none rounded-lg object-cover" src={preview} alt={title || "Фото товара"} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{fileName || "Фото товара"}</p>
            <p className="mt-1 text-xs text-zinc-500">Это фото будет показано в карточке и на странице товара.</p>
          </div>
          <button
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-700"
            type="button"
            title="Убрать фото"
            onClick={clearPreview}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex gap-2 rounded-xl bg-cyan-50 px-3 py-2.5 text-xs leading-5 text-cyan-900">
        <svg className="mt-0.5 flex-none text-cyan-700" width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16h.01" />
        </svg>
        <p>Фото показывается на странице товара и в карточке объявления.</p>
      </div>
    </div>
  );
}
