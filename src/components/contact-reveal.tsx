"use client";

import Link from "next/link";
import { useState } from "react";

export function ContactReveal({
  contact,
  signedIn
}: {
  contact: string;
  signedIn: boolean;
}) {
  const [visible, setVisible] = useState(false);

  if (!signedIn) {
    return (
      <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
        <Link className="btn btn-primary w-full sm:w-auto" href="/auth/signin">
          Посмотреть контакт
        </Link>
        <p className="mt-2 text-xs text-zinc-500">Войдите, чтобы видеть контакт исполнителя.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
      {visible ? (
        <p>
          <span className="font-medium text-zinc-900">Контакт: </span>
          {contact}
        </p>
      ) : (
        <button className="btn btn-primary w-full sm:w-auto" type="button" onClick={() => setVisible(true)}>
          Посмотреть контакт
        </button>
      )}
    </div>
  );
}
