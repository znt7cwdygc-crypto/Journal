"use client";

import Link from "next/link";
import { useState } from "react";

export function ContactReveal({
  contact,
  signedIn,
  compact = false
}: {
  contact: string;
  signedIn: boolean;
  compact?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const buttonClass = compact ? "btn btn-primary h-10 w-full px-2 text-xs" : "btn btn-primary w-full sm:w-auto";

  if (!signedIn) {
    return (
      <div className={compact ? "relative min-w-0" : "rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700"}>
        <Link className={buttonClass} href="/auth/signin">
          {compact ? "Контакт" : "Посмотреть контакт"}
        </Link>
        {!compact && <p className="mt-2 text-xs text-zinc-500">Войдите, чтобы видеть контакт исполнителя.</p>}
      </div>
    );
  }

  return (
    <div className={compact ? "relative min-w-0" : "rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700"}>
      <button className={buttonClass} type="button" onClick={() => setVisible((current) => !current)}>
        {compact ? "Контакт" : "Посмотреть контакт"}
      </button>
      {visible && (
        <div
          className={
            compact
              ? "absolute left-0 top-full z-20 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-lg"
              : "mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700"
          }
        >
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">Контакт</span>
          <span className="mt-1 block max-w-[18rem] overflow-hidden text-ellipsis whitespace-nowrap">{contact}</span>
        </div>
      )}
    </div>
  );
}
