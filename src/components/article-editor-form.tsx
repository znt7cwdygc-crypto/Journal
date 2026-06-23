"use client";

import { useRef, useState } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";
import { TiptapArticleEditor } from "@/components/tiptap-article-editor";

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

export function ArticleEditorForm({ action, draftAction, submitLabel = "Опубликовать", initialDraft }: ArticleEditorFormProps) {
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [summary, setSummary] = useState(initialDraft?.summary ?? "");
  const [format, setFormat] = useState(initialDraft?.format ?? formats[0]);
  const [topic, setTopic] = useState(initialDraft?.topic ?? "");
  const [coverImage, setCoverImage] = useState(normalizeImagePath(initialDraft?.coverImage ?? ""));
  const [coverPreview, setCoverPreview] = useState(normalizeImagePath(initialDraft?.coverImage ?? ""));
  const [coverName, setCoverName] = useState(initialDraft?.coverImage ? "Текущая обложка статьи" : "");
  const [isDraggingCover, setIsDraggingCover] = useState(false);
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
    setCoverName(file.name);
    setUploadMessage("");

    try {
      setIsUploading(true);
      const savedSrc = await uploadFile(file);
      setCoverImage(savedSrc);
      setUploadMessage("Обложка загружена.");
      if (coverInputRef.current) coverInputRef.current.value = "";
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Не удалось сохранить обложку");
    } finally {
      setIsUploading(false);
    }
  }

  function removeCover() {
    setCoverImage("");
    setCoverPreview("");
    setCoverName("");
    setUploadMessage("");
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  return (
    <section className="bg-white">
      <form action={action} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <input type="hidden" name="draftId" value={initialDraft?.id ?? ""} />
        <input type="hidden" name="coverImage" value={coverImage} />

        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-5 sm:p-6">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-[-0.01em] text-ink">{initialDraft?.id ? "Редактировать статью" : "Написать статью"}</h3>
            <p className="mt-1 text-sm leading-5 text-zinc-500">История, разбор, вопрос или полезный материал для сообщества</p>
          </div>
          <span className="shrink-0 rounded-full bg-hot px-3 py-1 text-xs font-semibold text-white">{initialDraft?.id ? "Редактирование" : "Новая"}</span>
        </div>

        <section className="border-b border-zinc-100 p-5 sm:p-6">
          <div className="flex gap-3 rounded-xl bg-cyan-50 px-4 py-3 text-cyan-900">
            <svg className="mt-0.5 shrink-0 text-cyan-700" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-cyan-800">Как написать гайд</p>
              <p className="mt-1 text-sm leading-6 text-cyan-900/80">
                Выберите формат «Гайд / инструкция» и ведите читателя по шагам: для кого материал, что понадобится, порядок действий, частые ошибки, чек-лист или вывод.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-zinc-100 p-5 sm:p-6">
          <label className="form-label">Обложка</label>
          <input
            ref={coverInputRef}
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void addCover(file);
            }}
          />
          {!coverPreview ? (
            <button
              className={`mt-2 flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-7 text-center transition ${
                isDraggingCover ? "border-[#ff4d2e] bg-[#fff1ed]" : "border-zinc-300 bg-white hover:border-[#ff4d2e] hover:bg-[#fff1ed]"
              }`}
              type="button"
              onClick={() => coverInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingCover(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingCover(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDraggingCover(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingCover(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void addCover(file);
              }}
            >
              <svg className="mb-2 text-zinc-500" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="10" r="1.3" />
                <path d="M21 16l-5-5-3 3-2-2-4 4" />
              </svg>
              <span className="text-sm font-semibold text-ink">Перетащите изображение или нажмите для выбора</span>
              <span className="mt-1 text-xs text-zinc-500">PNG, JPG, WebP или GIF до 5 МБ</span>
            </button>
          ) : (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
              <img className="h-16 w-16 shrink-0 rounded-lg object-cover" src={coverPreview} alt="Обложка статьи" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{coverName || "Обложка статьи"}</p>
                <p className="mt-1 text-xs text-zinc-500">Обложка появится в статье и карточке ленты.</p>
              </div>
              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-700"
                type="button"
                title="Убрать обложку"
                onClick={removeCover}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          )}
          {(uploadMessage || isUploading) && (
            <p className="mt-2 text-sm font-medium text-zinc-700">{isUploading ? "Загружаем обложку..." : uploadMessage}</p>
          )}
        </section>

        <section className="border-b border-zinc-100 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="form-label">
              Рубрика
              <select className="form-field mt-2" name="topic" value={topic} onChange={(event) => setTopic(event.target.value)} required>
                <option value="" disabled>Выберите рубрику</option>
                {topics.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="form-label">
              Формат
              <select className="form-field mt-2" name="format" value={format} onChange={(event) => setFormat(event.target.value)}>
                {formats.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="border-b border-zinc-100 p-5 sm:p-6">
          <label className="form-label">
            Заголовок
            <input className="form-field mt-2" name="title" placeholder="Например: как я выбрала студию и не пожалела" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
        </section>

        <section className="border-b border-zinc-100 p-5 sm:p-6">
          <label className="form-label">
            Короткое описание
            <textarea
              className="form-textarea mt-2 min-h-[72px]"
              maxLength={260}
              name="summary"
              placeholder="Одно-два предложения для карточки в ленте"
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              required
            />
          </label>
          <p className="mt-1 text-right text-xs text-zinc-500">{summary.length}/260</p>
        </section>

        <section className="border-b border-zinc-100 p-5 sm:p-6">
          <label className="form-label">
            Текст статьи
            <div className="mt-2">
              <TiptapArticleEditor name="body" initialContent={initialDraft?.body ?? ""} />
            </div>
          </label>
        </section>

        <div className="flex gap-2 border-b border-zinc-100 px-5 py-4 text-xs leading-5 text-zinc-500 sm:px-6">
          <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 018 0v3" />
          </svg>
          <span>Не указывайте реальные имена, адреса, документы, аккаунты клиентов или чужие контакты.</span>
        </div>

        <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end sm:p-6">
          <FormSubmitButton className="btn btn-ghost w-full sm:w-auto" disabled={isUploading} formAction={draftAction} pendingText="Сохраняем...">
            Сохранить черновик
          </FormSubmitButton>
          <FormSubmitButton className="btn btn-primary w-full sm:w-auto" disabled={isUploading} pendingText="Публикуем...">
            {submitLabel}
          </FormSubmitButton>
        </div>
      </form>
    </section>
  );
}
