"use client";

import { useRef } from "react";
import { ModelResumeForm } from "@/components/model-resume-form";

type ResumeQuizDisclosureProps = {
  action: (formData: FormData) => void | Promise<void>;
  resume?: Parameters<typeof ModelResumeForm>[0]["resume"];
};

function closeSiblingPanels(current: HTMLDetailsElement) {
  document.querySelectorAll<HTMLDetailsElement>("details[data-cabinet-panel]").forEach((details) => {
    if (details !== current) details.open = false;
  });
}

export function ResumeQuizDisclosure({ action, resume }: ResumeQuizDisclosureProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  function handleToggle() {
    const details = detailsRef.current;
    if (!details?.open) return;

    closeSiblingPanels(details);
    window.setTimeout(() => {
      details.querySelector("[data-quiz-root]")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 0);
  }

  return (
    <details id="resume" ref={detailsRef} data-cabinet-panel className="group rounded-lg bg-white shadow-sm" onToggle={handleToggle}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <div>
          <h2 className="font-semibold">Разместить резюме</h2>
          <p className="mt-1 text-xs text-zinc-500">{resume ? "Резюме уже опубликовано, можно обновить" : "Модель или специалист — квиз подстроится"}</p>
        </div>
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">{resume ? "Обновить" : "Создать"}</span>
      </summary>
      <div className="border-t border-zinc-100 p-3">
        <ModelResumeForm action={action} resume={resume} />
      </div>
    </details>
  );
}
