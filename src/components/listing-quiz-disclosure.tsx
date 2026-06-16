"use client";

import { useRef } from "react";
import { ListingQuizForm } from "@/components/listing-quiz-form";

type ListingQuizDisclosureProps = {
  action: (formData: FormData) => void | Promise<void>;
  kind: "VACANCY" | "SERVICE";
};

const copy = {
  VACANCY: {
    id: "vacancy",
    title: "Подать вакансию",
    hint: "Подробный квиз для поиска специалиста, кроме моделей",
    badge: "Вакансия"
  },
  SERVICE: {
    id: "service",
    title: "Предложить услугу",
    hint: "Подробный квиз с ценой, форматом и составом услуги",
    badge: "Услуга"
  }
};

function closeSiblingPanels(current: HTMLDetailsElement) {
  document.querySelectorAll<HTMLDetailsElement>("details[data-cabinet-panel]").forEach((details) => {
    if (details !== current) details.open = false;
  });
}

export function ListingQuizDisclosure({ action, kind }: ListingQuizDisclosureProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const content = copy[kind];

  function handleToggle() {
    const details = detailsRef.current;
    if (!details?.open) return;

    closeSiblingPanels(details);
    window.setTimeout(() => {
      details.querySelector("[data-quiz-root]")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }

  return (
    <details id={content.id} ref={detailsRef} data-cabinet-panel onToggle={handleToggle} className="group rounded-lg bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <div>
          <h2 className="font-semibold">{content.title}</h2>
          <p className="mt-1 text-xs text-zinc-500">{content.hint}</p>
        </div>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">{content.badge}</span>
      </summary>
      <div className="border-t border-zinc-100 p-3">
        <ListingQuizForm action={action} kind={kind} />
      </div>
    </details>
  );
}
