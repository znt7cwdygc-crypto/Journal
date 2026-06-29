import type { Guide } from "@prisma/client";
import { Card, CardTitle } from "@/components/admin/ui";

const kindOptions = [
  { value: "guide", label: "Гайд" },
  { value: "vacancy", label: "Вакансия" },
  { value: "service", label: "Услуга" },
  { value: "resume", label: "Резюме" },
];

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

function TextArea({ label, name, defaultValue, required, rows = 3, placeholder }: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none"
      />
    </label>
  );
}

export function GuideForm({ action, guide }: { action: (fd: FormData) => Promise<void>; guide?: Guide }) {
  return (
    <form action={action}>
      {guide && <input type="hidden" name="id" value={guide.id} />}

      <div className="space-y-5">
        <Card>
          <CardTitle>Основные поля</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Название (title)" name="title" defaultValue={guide?.title} required />
            <Field label="H1" name="h1" defaultValue={guide?.h1} required />
            <Field label="Slug" name="slug" defaultValue={guide?.slug} required placeholder="rabota-webcam-bez-opyta" />
            <Field label="Путь (path)" name="path" defaultValue={guide?.path} required placeholder="/guides/rabota-webcam-bez-opyta" />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">Тип (kind)</span>
              <select
                name="kind"
                defaultValue={guide?.kind || "guide"}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              >
                {kindOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <Field label="Порядок сортировки" name="sortOrder" defaultValue={String(guide?.sortOrder ?? 0)} type="number" />
          </div>
        </Card>

        <Card>
          <CardTitle>Контент</CardTitle>
          <div className="grid gap-4">
            <TextArea label="Description (meta)" name="description" defaultValue={guide?.description} required rows={2} />
            <TextArea label="Intro" name="intro" defaultValue={guide?.intro} required rows={3} />
            <TextArea label="Audience" name="audience" defaultValue={guide?.audience || ""} rows={2} />
            <Field label="Keywords (через запятую)" name="keywords" defaultValue={guide?.keywords.join(", ")} placeholder="работа вебкам, вебкам модель" />
          </div>
        </Card>

        <Card>
          <CardTitle>Sections (JSON)</CardTitle>
          <TextArea
            label="Секции"
            name="sections"
            defaultValue={guide?.sections || '[{"title":"","body":""}]'}
            required
            rows={8}
            placeholder='[{"title":"Заголовок","body":"Текст секции"}]'
          />
        </Card>

        <Card>
          <CardTitle>Категория и быстрый ответ</CardTitle>
          <div className="grid gap-4">
            <Field label="Категория" name="category" defaultValue={guide?.category || ""} placeholder="Новичкам, Деньги, Безопасность..." />
            <TextArea label="Быстрый ответ (quickAnswer)" name="quickAnswer" defaultValue={guide?.quickAnswer || ""} rows={3} placeholder="Краткий ответ для сниппета" />
            <TextArea
              label="Чеклист (JSON)"
              name="checklist"
              defaultValue={guide?.checklist || '[]'}
              rows={4}
              placeholder='["Пункт 1", "Пункт 2", "Пункт 3"]'
            />
            <TextArea
              label="Частые ошибки (JSON)"
              name="mistakes"
              defaultValue={guide?.mistakes || '[]'}
              rows={4}
              placeholder='["Ошибка 1", "Ошибка 2"]'
            />
          </div>
        </Card>

        <Card>
          <CardTitle>FAQ (JSON)</CardTitle>
          <TextArea
            label="Вопросы и ответы"
            name="faq"
            defaultValue={guide?.faq || '[{"question":"","answer":""}]'}
            required
            rows={6}
            placeholder='[{"question":"Вопрос?","answer":"Ответ."}]'
          />
        </Card>

        <Card>
          <CardTitle>CTA и связи</CardTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="CTA Label" name="ctaLabel" defaultValue={guide?.ctaLabel || ""} />
            <Field label="CTA Href" name="ctaHref" defaultValue={guide?.ctaHref || ""} />
            <div className="md:col-span-2">
              <Field label="Related (пути через запятую)" name="related" defaultValue={guide?.related.join(", ")} placeholder="/guides/slug1, /vacancies/slug2" />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Публикация</CardTitle>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPublished" defaultChecked={guide?.isPublished ?? true} />
              Опубликовано
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="showOnHome" defaultChecked={guide?.showOnHome ?? false} />
              На главной
            </label>
          </div>
        </Card>

        <button type="submit" className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">
          {guide ? "Сохранить" : "Создать"}
        </button>
      </div>
    </form>
  );
}
