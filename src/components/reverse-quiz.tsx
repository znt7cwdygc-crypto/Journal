"use client";

import Link from "next/link";
import { useState } from "react";
import { sendInviteAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type Requirement = {
  label: string;
  value: string;
  importance: string;
  isPercent: boolean;
  minPercent?: number;
};

function parseRequirements(bio: string): Requirement[] {
  const lines = bio.split("\n").map((l) => l.trim()).filter(Boolean);
  const results: Requirement[] = [];
  const importancePattern = /\s\((обязательно|желательно|не важно)\)$/;

  for (const line of lines) {
    const match = line.match(importancePattern);
    if (!match) continue;

    const importance = match[1];
    const clean = line.replace(importancePattern, "");
    const sepIdx = clean.indexOf(":");
    if (sepIdx <= 0) continue;

    const label = clean.slice(0, sepIdx).trim();
    const value = clean.slice(sepIdx + 1).trim();

    const percentMatch = value.match(/(\d+)\s*%/);
    if (label.toLowerCase().includes("процент") && percentMatch) {
      results.push({
        label,
        value,
        importance,
        isPercent: true,
        minPercent: parseInt(percentMatch[1], 10)
      });
    } else {
      results.push({ label, value, importance, isPercent: false });
    }
  }

  return results;
}

export function ReverseQuiz({
  resumeId,
  bio,
  roleGoal,
  signedIn,
  canProvide,
  hasBalance
}: {
  resumeId: string;
  bio: string;
  roleGoal: string;
  signedIn: boolean;
  canProvide: boolean;
  hasBalance: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [offeredPercent, setOfferedPercent] = useState<number | null>(null);

  const isModel = roleGoal.toLowerCase().includes("модель");
  const price = isModel ? 15 : 5;
  const requirements = parseRequirements(bio);

  if (!signedIn) {
    return (
      <div className="rounded-lg bg-zinc-50 p-4 text-center text-sm">
        <Link className="btn btn-primary" href="/auth/signin">Войдите, чтобы отправить инвайт</Link>
      </div>
    );
  }

  if (!canProvide) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        Включите режим поставщика в <Link href="/cabinet#profile" className="font-semibold underline">кабинете</Link>
      </div>
    );
  }

  if (!hasBalance) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        Пополните баланс в <Link href="/cabinet" className="font-semibold underline">кабинете</Link>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="btn btn-primary h-10 w-full px-2 text-xs" type="button" onClick={() => setOpen(true)}>
        Получить контакт
      </button>
    );
  }

  const percentReq = requirements.find((r) => r.isPercent);
  const minP = percentReq?.minPercent ?? 30;

  function handleCheck(label: string, value: string) {
    setAnswers((prev) => {
      const next = { ...prev };
      if (next[label]) {
        delete next[label];
      } else {
        next[label] = value;
      }
      return next;
    });
  }

  const allRequiredAnswered = requirements
    .filter((r) => r.importance === "обязательно" && !r.isPercent)
    .every((r) => answers[r.label]);

  const quizJson = JSON.stringify(
    requirements.map((r) => ({
      label: r.label,
      value: r.isPercent ? `${offeredPercent ?? minP}%` : (answers[r.label] || ""),
      confirmed: r.isPercent ? true : Boolean(answers[r.label]),
      importance: r.importance
    }))
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Подтвердите условия модели</h3>
      <p className="mt-1 text-xs text-zinc-500">Отметьте, что вы готовы обеспечить каждое условие</p>

      <div className="mt-4 space-y-3">
        {requirements.map((req) => (
          <div key={req.label} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3">
            {req.isPercent ? (
              <div className="flex-1">
                <p className="text-sm font-medium">{req.label}</p>
                <p className="mt-1 text-xs text-zinc-500">Минимум модели: {req.value}</p>
                <select
                  className="mt-2 rounded border p-1.5 text-sm"
                  value={offeredPercent ?? minP}
                  onChange={(e) => setOfferedPercent(Number(e.target.value))}
                >
                  {Array.from({ length: 101 - minP }, (_, i) => minP + i).map((v) => (
                    <option key={v} value={v}>{v}%</option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                  checked={Boolean(answers[req.label])}
                  onChange={() => handleCheck(req.label, req.value)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{req.label}: {req.value}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    req.importance === "обязательно"
                      ? "bg-red-50 text-red-700"
                      : req.importance === "желательно"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-zinc-100 text-zinc-600"
                  }`}>
                    {req.importance}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}

        {requirements.length === 0 && (
          <p className="text-xs text-zinc-500">Модель не указала структурированных требований.</p>
        )}
      </div>

      <form action={sendInviteAction} className="mt-4 space-y-3">
        <input type="hidden" name="resumeId" value={resumeId} />
        <input type="hidden" name="quizAnswers" value={quizJson} />
        {offeredPercent !== null && <input type="hidden" name="offeredPercent" value={offeredPercent} />}
        {percentReq && offeredPercent === null && <input type="hidden" name="offeredPercent" value={minP} />}

        <div>
          <label className="block text-sm font-medium">Личное сообщение модели</label>
          <textarea
            className="mt-1 w-full rounded border p-2 text-sm"
            name="message"
            rows={3}
            minLength={20}
            required
            placeholder="Расскажите о себе и условиях (минимум 20 символов)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="mt-1 text-xs text-zinc-400">{message.length}/20 мин.</p>
        </div>

        <FormSubmitButton
          className="btn btn-primary w-full"
          pendingText="Отправка..."
          disabled={!allRequiredAnswered || message.length < 20}
        >
          Оплатить ${price} и отправить инвайт
        </FormSubmitButton>
      </form>
    </div>
  );
}
