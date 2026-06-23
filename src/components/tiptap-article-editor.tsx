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
  title,
  wide
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <button
      aria-label={title}
      className={`flex h-7 items-center justify-center rounded-md text-xs font-semibold transition ${
        wide ? "px-2.5" : "w-8"
      } ${active ? "bg-zinc-900 text-white" : "bg-transparent text-zinc-700 hover:bg-zinc-200"} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  );
}

function ToolbarGroup({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-zinc-200" />;
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
        class: "tiptap-article-content min-h-[170px] outline-none"
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
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-100 bg-zinc-50 p-1.5">
        <ToolbarGroup>
          <ToolbarButton wide active={editor?.isActive("paragraph")} disabled={!editor} onClick={() => editor?.chain().focus().setParagraph().run()} title="Обычный текст">
            Текст
          </ToolbarButton>
          <ToolbarButton wide active={editor?.isActive("heading", { level: 2 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Заголовок">
            H2
          </ToolbarButton>
          <ToolbarButton wide active={editor?.isActive("heading", { level: 3 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Подзаголовок">
            H3
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarDivider />
        <ToolbarGroup>
          <ToolbarButton active={editor?.isActive("bold")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()} title="Жирный">
            Ж
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive("italic")} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Курсив">
            К
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive("underline")} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Подчеркнутый">
            Ч
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarDivider />
        <ToolbarGroup>
          <ToolbarButton active={editor?.isActive("bulletList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Маркированный список">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /><path d="M9 6h11M9 12h11M9 18h11" /></svg>
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive("orderedList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Нумерованный список">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 10h1M4 14h.01M4 18h1" /></svg>
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive("blockquote")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Цитата">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 7h3v4l-2 6H6l1.5-5H7zm9 0h3v4l-2 6h-2l1.5-5H16z" /></svg>
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarDivider />
        <ToolbarGroup>
          <ToolbarButton active={editor?.isActive("link")} disabled={!editor} onClick={setLink} title="Ссылка">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 14a4 4 0 005.66 0l2.83-2.83a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0L5.5 12.83a4 4 0 005.66 5.66l1-1" /></svg>
          </ToolbarButton>
          <ToolbarButton disabled={!editor} onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Разделитель">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16" /></svg>
          </ToolbarButton>
          <label className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-transparent text-zinc-700 transition hover:bg-zinc-200 ${isUploading ? "pointer-events-none opacity-50" : ""}`} title="Фото">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-3 3-2-2-4 4" /></svg>
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
        </ToolbarGroup>
        <ToolbarDivider />
        <ToolbarGroup>
          <ToolbarButton active={editor?.isActive({ textAlign: "left" })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("left").run()} title="По левому краю">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h16" /></svg>
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive({ textAlign: "center" })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("center").run()} title="По центру">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10M4 18h16" /></svg>
          </ToolbarButton>
          <ToolbarButton active={editor?.isActive({ textAlign: "right" })} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("right").run()} title="По правому краю">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M10 12h10M4 18h16" /></svg>
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarDivider />
        <ToolbarGroup>
          <ToolbarButton disabled={!editor || !editor.can().undo()} onClick={() => editor?.chain().focus().undo().run()} title="Назад">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14l-4-4 4-4M5 10h9a5 5 0 010 10h-1" /></svg>
          </ToolbarButton>
          <ToolbarButton disabled={!editor || !editor.can().redo()} onClick={() => editor?.chain().focus().redo().run()} title="Вперед">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l4 4-4 4M19 10h-9a5 5 0 000 10h1" /></svg>
          </ToolbarButton>
        </ToolbarGroup>
      </div>
      <EditorContent editor={editor} />
      {(uploadMessage || isUploading) && (
        <p className="border-t border-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600">
          {isUploading ? "Загружаем изображение..." : uploadMessage}
        </p>
      )}
    </div>
  );
}
