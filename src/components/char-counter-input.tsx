"use client";

import { useState, type InputHTMLAttributes } from "react";

export function CharCounterInput({
  className,
  maxLength,
  defaultValue,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { maxLength: number }) {
  const [count, setCount] = useState(String(defaultValue ?? "").length);

  return (
    <div>
      <input
        {...props}
        className={className}
        maxLength={maxLength}
        defaultValue={defaultValue}
        onChange={(e) => setCount(e.target.value.length)}
      />
      <p className="mt-0.5 text-right text-[10px] text-zinc-400">{count}/{maxLength}</p>
    </div>
  );
}
