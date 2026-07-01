"use client";

import Link from "next/link";
import { useState } from "react";
import { recordContactClickAction } from "@/app/actions";

type ContactTargetType = "PRODUCT" | "LISTING" | "RESUME" | "MATCH_PROFILE";

function parseTelegram(contact: string) {
  const trimmed = contact.trim();
  const tgMatch = trimmed.match(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/);
  if (tgMatch) return tgMatch[1];
  if (trimmed.startsWith("@") && /^@[a-zA-Z0-9_]{3,}$/.test(trimmed)) return trimmed.slice(1);
  return null;
}

function ContactPopup({ contact, compact }: { contact: string; compact: boolean }) {
  const tgUsername = parseTelegram(contact);

  return (
    <div
      className={
        compact
          ? "absolute left-0 top-full z-20 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-medium text-zinc-800 shadow-lg"
          : "mt-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm"
      }
    >
      {tgUsername ? (
        <div className="flex flex-col gap-2">
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">Telegram</span>
          <span className="block text-sm font-semibold text-zinc-900">@{tgUsername}</span>
          <a
            href={`https://t.me/${tgUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#2AABEE] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#229ED9]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            Написать в Telegram
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">Контакт</span>
          <span className="mt-1 block max-w-[18rem] overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-zinc-900">{contact}</span>
        </div>
      )}
    </div>
  );
}

export function ContactReveal({
  contact,
  signedIn,
  compact = false,
  targetType,
  targetId
}: {
  contact: string;
  signedIn: boolean;
  compact?: boolean;
  targetType?: ContactTargetType;
  targetId?: string;
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

  function handleClick() {
    setVisible((current) => {
      const next = !current;
      if (next && targetType && targetId) {
        recordContactClickAction(targetType, targetId).catch(() => null);
      }
      return next;
    });
  }

  return (
    <div className={compact ? "relative min-w-0" : "rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700"}>
      <button className={buttonClass} type="button" onClick={handleClick}>
        {compact ? "Контакт" : "Посмотреть контакт"}
      </button>
      {visible && <ContactPopup contact={contact} compact={compact} />}
    </div>
  );
}
