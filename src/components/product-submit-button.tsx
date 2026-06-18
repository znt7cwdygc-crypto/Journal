"use client";

import { useFormStatus } from "react-dom";

export function ProductSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn btn-primary w-full disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      {pending ? "Публикуем..." : label}
    </button>
  );
}
