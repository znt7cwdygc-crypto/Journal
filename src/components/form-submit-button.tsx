"use client";

import { useFormStatus } from "react-dom";

export function FormSubmitButton({
  children,
  pendingText,
  className,
  disabled,
  formAction
}: {
  children: React.ReactNode;
  pendingText: string;
  className: string;
  disabled?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={disabled || pending} formAction={formAction} type="submit">
      {pending ? pendingText : children}
    </button>
  );
}
