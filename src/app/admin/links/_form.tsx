import type { UsefulLink } from "@prisma/client";
import { Card, CardTitle } from "@/components/admin/ui";

function Field({ label, name, defaultValue, required, type = "text", placeholder }: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
      />
    </label>
  );
}

export function UsefulLinkForm({ action, link }: { action: (fd: FormData) => Promise<void>; link?: UsefulLink }) {
  return (
    <form action={action}>
      {link && <input type="hidden" name="id" value={link.id} />}
      <Card>
        <CardTitle>Основное</CardTitle>
        <div className="mt-4 space-y-4">
          <Field label="Название" name="title" defaultValue={link?.title} required placeholder="OBS Studio" />
          <Field label="URL" name="url" defaultValue={link?.url} required type="url" placeholder="https://example.com" />
          <Field label="Тема" name="topic" defaultValue={link?.topic} required placeholder="Стриминг" />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">Описание</span>
            <textarea
              name="description"
              defaultValue={link?.description}
              required
              rows={3}
              placeholder="Краткое описание ресурса"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </label>
          <Field label="Порядок сортировки" name="sortOrder" defaultValue={String(link?.sortOrder ?? 0)} type="number" />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isPublished" defaultChecked={link?.isPublished ?? true} />
            <span className="text-sm font-medium text-zinc-700">Опубликовано</span>
          </label>
        </div>
      </Card>
      <div className="mt-4">
        <button type="submit" className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          {link ? "Сохранить" : "Создать"}
        </button>
      </div>
    </form>
  );
}
