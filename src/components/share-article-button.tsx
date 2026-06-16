"use client";

import { useState } from "react";

type ShareArticleButtonProps = {
  url: string;
  repostCount: number;
};

export function ShareArticleButton({ url, repostCount }: ShareArticleButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="grid min-w-0 gap-2 rounded-lg bg-yellow-50/60 p-2 sm:flex sm:flex-wrap sm:items-center sm:bg-transparent sm:p-0">
      <button
        className="rounded-lg bg-yellow-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-yellow-100"
        type="button"
        onClick={copyLink}
      >
        {copied ? "Ссылка скопирована" : "Поделиться"}
      </button>
      <label className="grid min-w-0 gap-1 sm:flex sm:flex-1 sm:items-center sm:gap-2">
        <span className="text-xs font-medium text-zinc-500">Ссылка</span>
        <input
          className="min-w-0 rounded-lg border border-yellow-100 bg-white px-3 py-2 text-sm text-zinc-600 sm:flex-1 md:w-72"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <span className="text-xs font-medium text-zinc-500">{copyFailed ? "Скопируйте ссылку из поля" : `${repostCount} репостов`}</span>
    </div>
  );
}
