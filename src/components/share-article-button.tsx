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
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <button
        className="rounded-lg bg-yellow-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-yellow-100"
        type="button"
        onClick={copyLink}
      >
        {copied ? "Ссылка скопирована" : "Поделиться"}
      </button>
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">Ссылка на статью</span>
        <input
          className="min-w-0 flex-1 rounded-lg border border-yellow-100 bg-white px-3 py-2 text-sm text-zinc-600 md:w-72"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <span className="text-xs font-medium text-zinc-500">{copyFailed ? "Скопируйте ссылку из поля" : `${repostCount} репостов`}</span>
    </div>
  );
}
