"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type TiptapArticleEditorProps = {
  name: string;
  initialContent: string;
};

function looksLikeHtml(value: string) {
  return /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|u|a|img|hr|br)\b/i.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function normalizeImagePath(src: string) {
  return src.startsWith("/uploads/") ? src.replace("/uploads/", "/media/") : src;
}

function ToolbarButton({
  active,
  children,
  disabled,
  onClick,
  title
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-label={title}
      className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${active ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"} disabled:cursor-not-allowed disabled:opacity-40`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

export function TiptapArticleEditor({ name, initialContent }: TiptapArticleEditorProps) {
  const initialHtml = initialContent && looksLikeHtml(initialContent) ? initialContent : plainTextToHtml(initialContent);
  const [html, setHtml] = useState(initialHtml);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] }
      }),
      Underline,
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "article-inline-image" }
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      Placeholder.configure({
        placeholder: "Пишите текст статьи: абзацы, подзаголовки, списки, цитаты, ссылки и изображения."
      })
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: "tiptap-article-content min-h-[280px] outline-none"
      }
    },
    immediatelyRender: false,
    onUpdate({ editor: updatedEditor }) {
      setHtml(updatedEditor.getHTML());
    }
  });

  useEffect(() => {
    setHtml(editor?.getHTML() || initialHtml);
  }, [editor, initialHtml]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Ссылка", previousUrl || "https://");

    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }, [editor]);

  const uploadImage = useCallback(async (file: File) => {
    if (!editor) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploadMessage("");

    try {
      setIsUploading(true);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Не удалось загрузить изображение");
      const src = normalizeImagePath(String(result.url));
      editor.chain().focus().setImage({ src, alt: file.name }).run();
      setUploadMessage("Изображение добавлено в текст.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Не удалось добавить изображение");
    } finally {
      setIsUploading(false);
    }
  }, [editor]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white focus-within:border-[#ff4d2e] focus-within:ring-2 focus-within:ring-[#fff1ed]">
      <input name={name} type="hidden" value={html} />
      <div className="flex flex-wrap gap-1 border-b border-zinc-100 bg-zinc-50 p-2">
        <ToolbarButton active={editor?.isActive("paragraph")} disabled={!editor} onClick={() => editor?.chain().focus().setParagraph().run()} title="Обычный текст">
          Текст
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("heading", { level: 2 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Заголовок">
          Заголовок
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("heading", { level: 3 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Подзаголовок">
          Подзаг.
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("bold")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()} title="Жирный">
          Ж
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("italic")} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Курсив">
          К
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("underline")} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Подчеркнутый">
          Ч
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("bulletList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Список">
          • Список
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("orderedList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Нумерованный список">
          1. Список
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("blockquote")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Цитата">
          Цитата
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive("link")} disabled={!editor} onClick={setLink} title="Ссылка">
          Ссылка
        </ToolbarButton>
        <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Разделитель">
          Линия
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive({ textAlign: "left" })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("left").run()} title="По левому краю">
          Слева
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive({ textAlign: "center" })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("center").run()} title="По центру">
          Центр
        </ToolbarButton>
        <ToolbarButton active={editor?.isActive({ textAlign: "right" })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("right").run()} title="По правому краю">
          Справа
        </ToolbarButton>
        <label className={`cursor-pointer whitespace-nowrap rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 ${isUploading ? "pointer-events-none opacity-50" : ""}`} title="Изображение">
          Фото
          <input
            className="sr-only"
            disabled={!editor || isUploading}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void uploadImage(file);
            }}
          />
        </label>
        <ToolbarButton disabled={!editor || !editor.can().undo()} onClick={() => editor?.chain().focus().undo().run()} title="Отменить">
          Назад
        </ToolbarButton>
        <ToolbarButton disabled={!editor || !editor.can().redo()} onClick={() => editor?.chain().focus().redo().run()} title="Повторить">
          Вперед
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      {(uploadMessage || isUploading) && (
        <p className="border-t border-zinc-100 px-3 py-2 text-sm font-medium text-zinc-600">
          {isUploading ? "Загружаем изображение..." : uploadMessage}
        </p>
      )}
    </div>
  );
}
