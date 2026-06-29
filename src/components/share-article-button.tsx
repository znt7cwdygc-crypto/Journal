"use client";

import { useState } from "react";

type ShareArticleButtonProps = {
  url: string;
  repostCount: number;
};

export function ShareArticleButton({ url, repostCount }: ShareArticleButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      if (typeof window !== "undefined") window.prompt("Скопируйте ссылку:", url);
    }
  }

  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
      }`}
      type="button"
      onClick={copyLink}
    >
      {copied ? "✓ Скопировано" : `↗ Поделиться${repostCount > 0 ? ` ${repostCount}` : ""}`}
    </button>
  );
}
