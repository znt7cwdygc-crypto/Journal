"use client";

import { useRef, useState } from "react";

export function AdImageInput({ defaultUrl }: { defaultUrl?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState(defaultUrl ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой (макс. 5 МБ)");
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  const showPreview = preview || urlValue;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-zinc-500">Картинка/GIF баннера</label>

      {showPreview ? (
        <img src={showPreview} alt="" className="h-24 w-full max-w-xs rounded-lg border border-zinc-200 object-cover" />
      ) : (
        <div className="flex h-24 w-full max-w-xs flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 text-center">
          <span className="text-[11px] font-medium text-zinc-500">Нет картинки</span>
          <span className="mt-0.5 text-[10px] text-zinc-400">Рекомендуется: 800×450px (16:9), до 5 МБ</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {preview ? "Файл выбран ✓" : "Загрузить файл"}
        </button>
        <span className="text-[11px] text-zinc-400">или вставьте ссылку:</span>
      </div>

      <input
        className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
        name="imageUrl"
        type="text"
        value={urlValue}
        onChange={(e) => { setUrlValue(e.target.value); setPreview(null); }}
        placeholder="https://..."
      />
      <p className="text-[10px] text-zinc-400">
        При загрузке файла картинка автоматически сожмётся в WebP. Оптимальный размер: 800×450px (16:9), фон под тёмную подложку.
      </p>

      <input
        ref={inputRef}
        type="file"
        name="imageFile"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
