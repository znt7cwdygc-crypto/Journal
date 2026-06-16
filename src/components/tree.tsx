import { ReactNode } from "react";

export function TreeRoot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

export function TreeBranch({ label, children, defaultOpen = true }: { label: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="rounded-lg border border-soft bg-stone-50 px-3 py-2">
      <summary className="cursor-pointer select-none text-sm font-medium">{label}</summary>
      <div className="mt-2 border-l border-soft pl-3">{children}</div>
    </details>
  );
}

export function TreeLeaf({ children }: { children: ReactNode }) {
  return <div className="my-2 rounded-md bg-white p-3 text-sm shadow-sm">{children}</div>;
}
