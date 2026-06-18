"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function ProductSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const [locked, setLocked] = useState(false);
  const isBusy = pending || locked;

  return (
    <button
      className="btn btn-primary w-full disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      disabled={isBusy}
      type="submit"
      onClick={(event) => {
        if (event.currentTarget.form?.checkValidity()) {
          setLocked(true);
        }
      }}
    >
      {isBusy ? "Публикуем..." : label}
    </button>
  );
}
