"use client";

import { useEffect } from "react";

function openCabinetPanel(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;

  const panel = document.getElementById(id);
  if (!(panel instanceof HTMLDetailsElement) || !panel.matches("details[data-cabinet-panel]")) return;

  document.querySelectorAll<HTMLDetailsElement>("details[data-cabinet-panel]").forEach((details) => {
    details.open = details === panel;
  });

  window.setTimeout(() => {
    const target = panel.querySelector("[data-quiz-root]") ?? panel;
    target.scrollIntoView({ block: "start", behavior: "smooth" });
  }, 0);
}

export function CabinetPanelRouter() {
  useEffect(() => {
    const handleHashChange = () => openCabinetPanel(window.location.hash);
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");
      if (!link) return;
      openCabinetPanel(link.hash);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    document.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return null;
}
