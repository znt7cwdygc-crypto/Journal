"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { reportContentAction, type ReportContentState } from "@/app/actions";

type ReportTargetType = "ARTICLE" | "COMMENT" | "PROFILE" | "LISTING" | "PRODUCT" | "RESUME" | "MATCH_PROFILE";

export function ReportButton({
  targetType,
  targetId,
  next,
  buttonLabel = "Жалоба",
  buttonClassName = "btn btn-danger w-full",
  className = "relative min-w-0"
}: {
  targetType: ReportTargetType;
  targetId: string;
  next: string;
  buttonLabel?: string;
  buttonClassName?: string;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [formKey, setFormKey] = useState(0);
  const handleDone = useCallback(() => {
    if (detailsRef.current) detailsRef.current.open = false;
    setFormKey((key) => key + 1);
  }, []);

  return (
    <details ref={detailsRef} className={className}>
      <summary className={`${buttonClassName} flex cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden`}>
        {buttonLabel}
      </summary>
      <ReportForm
        key={formKey}
        targetType={targetType}
        targetId={targetId}
        next={next}
        onDone={handleDone}
      />
    </details>
  );
}

function ReportForm({
  targetType,
  targetId,
  next,
  onDone
}: {
  targetType: ReportTargetType;
  targetId: string;
  next: string;
  onDone: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<ReportContentState, FormData>(reportContentAction, {
    status: "idle",
    message: ""
  });

  useEffect(() => {
    if (state.status !== "success") return;

    formRef.current?.reset();
    const timer = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(timer);
  }, [onDone, state.status]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="absolute right-0 top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-lg"
    >
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="next" value={next} />
      {state.status === "success" ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {state.message}
        </div>
      ) : (
        <>
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400" htmlFor={`report-${targetType}-${targetId}`}>
            Причина жалобы
          </label>
          <textarea
            id={`report-${targetType}-${targetId}`}
            className="mt-2 min-h-20 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-hot"
            name="reason"
            placeholder="Коротко опишите проблему"
            required
            minLength={10}
            maxLength={500}
          />
          {state.status === "error" && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{state.message}</p>
          )}
          <SubmitButton />
        </>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="mt-2 h-9 w-full rounded-lg bg-ink px-3 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60" type="submit" disabled={pending}>
      {pending ? "Отправляем..." : "Отправить"}
    </button>
  );
}
