import { reportContentAction } from "@/app/actions";

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
  return (
    <details className={className}>
      <summary className={`${buttonClassName} flex cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden`}>
        {buttonLabel}
      </summary>
      <form
        action={reportContentAction}
        className="absolute right-0 top-full z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-lg"
      >
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="next" value={next} />
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
        <button className="mt-2 h-9 w-full rounded-lg bg-ink px-3 text-xs font-semibold text-white" type="submit">
          Отправить
        </button>
      </form>
    </details>
  );
}
