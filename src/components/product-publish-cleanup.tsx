"use client";

import { useEffect } from "react";

export function ProductPublishCleanup({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;

    const panel = document.querySelector<HTMLDetailsElement>("details#products");
    panel?.removeAttribute("open");
    panel?.querySelector("form")?.reset();
  }, [active]);

  return null;
}
