"use client";

import { useState } from "react";
import { respondInviteAction, reportInviteMismatchAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type QuizAnswer = {
  label: string;
  value: string;
  confirmed: boolean;
  importance: string;
};

type InviteData = {
  id: string;
  status: string;
  message: string;
  quizAnswers: string;
  offeredPercent: number | null;
  declineReason: string | null;
  createdAt: Date;
  respondedAt: Date | null;
  resume: {
    id: string;
    title: string;
    roleGoal: string;
    contactEmail: string | null;
    contactTelegram: string | null;
  };
  studio: {
    id: string;
    name: string | null;
    email: string | null;
    tgHandle: string | null;
    violationCount: number;
  };
};

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "только что";
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

export function InviteCard({ invite }: { invite: InviteData }) {
  const [showDecline, setShowDecline] = useState(false);
  const [declineText, setDeclineText] = useState("");

  let answers: QuizAnswer[] = [];
  try {
    answers = JSON.parse(invite.quizAnswers);
  } catch {
    /* ignore */
  }

  const studioLabel = `Студия #${invite.studio.id.slice(-4)}`;

  if (invite.status === "PENDING") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Новый инвайт</span>
          <span className="text-xs text-zinc-500">{timeAgo(invite.createdAt)}</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">На резюме: {invite.resume.title}</p>

        <div className="mt-3 space-y-1">
          {answers.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-emerald-600">&#10003;</span>
              <span className="font-medium text-zinc-700">{a.label}:</span>
              <span className="text-zinc-900">{a.value}</span>
            </div>
          ))}
        </div>

        {invite.offeredPercent && (
          <p className="mt-2 text-sm font-medium text-zinc-800">Предложенный процент: {invite.offeredPercent}%</p>
        )}

        <div className="mt-3 rounded-lg bg-zinc-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Сообщение</p>
          <p className="mt-1 text-sm text-zinc-800">{invite.message}</p>
        </div>

        {invite.studio.violationCount > 0 && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            Нарушений у студии: {invite.studio.violationCount}
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-500">От: {studioLabel}</p>

        <div className="mt-3 space-y-2">
          <form action={respondInviteAction}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <input type="hidden" name="response" value="accept" />
            <input type="hidden" name="declineReason" value="" />
            <FormSubmitButton className="btn btn-primary w-full text-sm" pendingText="Раскрываю...">
              Согласна — раскрыть контакты
            </FormSubmitButton>
          </form>

          {!showDecline ? (
            <button type="button" className="btn btn-muted w-full text-sm" onClick={() => setShowDecline(true)}>
              Отклонить
            </button>
          ) : (
            <form action={respondInviteAction} className="space-y-2">
              <input type="hidden" name="inviteId" value={invite.id} />
              <input type="hidden" name="response" value="decline" />
              <textarea
                name="declineReason"
                value={declineText}
                onChange={(e) => setDeclineText(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 p-3 text-sm outline-none focus:border-hot"
                rows={3}
                placeholder="Укажите причину отклонения..."
                required
                minLength={5}
              />
              <p className="text-xs text-zinc-400">{declineText.length}/5 мин. символов</p>
              <div className="flex gap-2">
                <FormSubmitButton className="btn btn-danger flex-1 text-sm" pendingText="Отклоняю...">
                  Отклонить инвайт
                </FormSubmitButton>
                <button type="button" className="btn btn-muted text-sm" onClick={() => { setShowDecline(false); setDeclineText(""); }}>
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (invite.status === "ACCEPTED") {
    const studioContact = invite.studio.tgHandle || invite.studio.email || "Контакт не указан";
    const modelContact = [invite.resume.contactEmail, invite.resume.contactTelegram].filter(Boolean).join(" • ") || "Контакт не указан";
    const tgLink = invite.studio.tgHandle
      ? `https://t.me/${invite.studio.tgHandle.replace(/^@/, "")}`
      : null;

    return (
      <div className="rounded-lg border border-sky-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">Согласовано</span>
          <span className="text-xs text-zinc-500">{invite.respondedAt ? timeAgo(invite.respondedAt) : ""}</span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Резюме: {invite.resume.title}</p>

        <div className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3 text-sm">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Студия</span>
            <p className="font-medium text-zinc-900">{invite.studio.name || invite.studio.email || studioLabel}</p>
            <p className="text-zinc-600">{studioContact}</p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Ваш контакт</span>
            <p className="text-zinc-600">{modelContact}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {tgLink && (
            <a className="btn btn-primary text-sm" href={tgLink} target="_blank" rel="noopener noreferrer">
              Написать
            </a>
          )}
          <form action={reportInviteMismatchAction}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <input type="hidden" name="reason" value="Несоответствие условий" />
            <FormSubmitButton className="btn btn-danger text-sm" pendingText="Отправка...">
              Несоответствие условий
            </FormSubmitButton>
          </form>
        </div>
      </div>
    );
  }

  // DECLINED / EXPIRED
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 opacity-60">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
          {invite.status === "DECLINED" ? "Отклонено" : "Истекло"}
        </span>
        <span className="text-xs text-zinc-500">{timeAgo(invite.createdAt)}</span>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Резюме: {invite.resume.title}</p>
      {invite.declineReason && (
        <div className="mt-2 rounded-lg bg-zinc-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Причина отклонения</p>
          <p className="mt-1 text-sm text-zinc-700">{invite.declineReason}</p>
        </div>
      )}
    </div>
  );
}
