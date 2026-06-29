"use client";

import { useRef, useState } from "react";

export function AvatarUpload({
  currentImage,
  fallbackLetter
}: {
  currentImage: string | null;
  fallbackLetter: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой (макс. 5 МБ)");
      e.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  const src = preview || currentImage;

  return (
    <div className="flex items-center gap-4">
      {src ? (
        <img className="h-14 w-14 rounded-full object-cover" src={src} alt="" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-hot text-xl font-black text-white">
          {fallbackLetter}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex cursor-pointer rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {preview ? "Выбрано ✓" : "Загрузить фото"}
        </button>
        {preview && (
          <span className="text-[10px] text-zinc-400">Нажмите «Сохранить» чтобы применить</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name="avatarFile"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
