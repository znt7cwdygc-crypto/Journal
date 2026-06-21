import Link from "next/link";

export function CatalogPageHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  actionHref
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title mt-1">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-lg sm:leading-8">{description}</p>
      </div>
      <Link className="btn btn-primary shrink-0 text-center sm:min-w-44" href={actionHref}>
        {actionLabel}
      </Link>
    </div>
  );
}
