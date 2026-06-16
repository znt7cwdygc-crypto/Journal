"use client";

import { useState } from "react";

type ArticleEditorFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  draftAction: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
  initialDraft?: {
    id: string;
    title: string;
    summary: string;
    body: string;
    format: string | null;
    topic: string | null;
    coverImage: string | null;
  } | null;
};

const guideFormat = "Гайд / инструкция";
const formats = ["Личная история", guideFormat, "Разбор ошибки", "Советы новичкам", "Сколько я заработала", "Как выбрать студию", "Вопрос сообществу"];
const topics = ["Истории", "Деньги", "Безопасность", "Работа", "Студии", "Разборы", "Инструменты", "Вопросы"];

function normalizeImagePath(src: string) {
  return src.startsWith("/uploads/") ? src.replace("/uploads/", "/media/") : src;
}

function cleanBody(body: string) {
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => {
      const image = part.match(/^!\[(.*?)\]\((\/(?:uploads|media)\/[^)\s]+|https?:\/\/[^)\s]+)\)$/);
      return !image;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function ArticleEditorForm({ action, draftAction, submitLabel = "Опубликовать", initialDraft }: ArticleEditorFormProps) {
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");
  const [format, setFormat] = useState(initialDraft?.format ?? formats[0]);
  const [topic, setTopic] = useState(initialDraft?.topic ?? "");
  const [body, setBody] = useState(() => cleanBody(initialDraft?.body ?? ""));
  const [coverImage, setCoverImage] = useState(normalizeImagePath(initialDraft?.coverImage ?? ""));
  const [coverPreview, setCoverPreview] = useState(normalizeImagePath(initialDraft?.coverImage ?? ""));
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || "Не удалось загрузить файл");
    return normalizeImagePath(String(result.url));
  }

  async function addCover(file: File) {
    const previewSrc = URL.createObjectURL(file);
    setCoverPreview(previewSrc);
    setUploadMessage("");

    try {
      setIsUploading(true);
      const savedSrc = await uploadFile(file);
      setCoverImage(savedSrc);
      setUploadMessage("Обложка загружена.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Не удалось сохранить обложку");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="bg-white">
      <form action={action} className="space-y-4">
        <input type="hidden" name="draftId" value={initialDraft?.id ?? ""} />
        <input type="hidden" name="coverImage" value={coverImage} />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="form-label">
            Рубрика
            <select className="form-field" name="topic" value={topic} onChange={(event) => setTopic(event.target.value)} required>
              <option value="" disabled>Выберите рубрику</option>
              {topics.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="form-label">
            Формат
            <select className="form-field" name="format" value={format} onChange={(event) => setFormat(event.target.value)}>
              {formats.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <section className="form-hint">
          <p className="font-semibold">Как написать гайд</p>
          <p className="mt-1">Выберите формат `Гайд / инструкция` и ведите читателя по шагам: для кого материал, что понадобится, порядок действий, частые ошибки, чек-лист или вывод.</p>
        </section>

        <label className="form-label">
          Заголовок
          <input className="form-field" name="title" placeholder="Например: как я выбрала студию и не пожалела" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label className="form-label">
          Короткое описание
          <textarea className="form-textarea" name="summary" placeholder="Одно-два предложения для карточки в ленте" rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} required />
        </label>

        <label className="form-label">
          Текст статьи
          <textarea className="form-textarea min-h-[260px] py-3 leading-7" name="body" placeholder="Пишите как обычный пост на форуме: текст, абзацы, списки, вопросы к читателям." value={body} onChange={(event) => setBody(event.target.value)} required />
        </label>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <label className="form-label">
            Обложка
            <input className="mt-2 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white" name="coverFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void addCover(file);
            }} />
          </label>
          {coverPreview && (
            <img className="mt-3 aspect-[16/7] w-full rounded-lg object-cover" src={coverPreview} alt="Обложка статьи" />
          )}
          {uploadMessage && <p className="mt-2 text-sm font-medium text-zinc-700">{uploadMessage}</p>}
          {isUploading && <p className="mt-2 text-sm font-medium text-amber-700">Загружаем обложку...</p>}
        </div>

        <p className="text-xs leading-5 text-zinc-500">Не указывайте реальные имена, адреса, документы, аккаунты клиентов или чужие контакты.</p>

        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
          <button className="btn btn-ghost" type="submit" formAction={draftAction} disabled={isUploading}>
            Сохранить черновик
          </button>
          <button className="btn btn-primary" type="submit" disabled={isUploading}>
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
