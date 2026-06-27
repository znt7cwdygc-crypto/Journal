import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"]
]);

type UploadedFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name?: string;
  size?: number;
  type?: string;
};

export function isUploadedFile(value: unknown): value is UploadedFile {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      typeof value.arrayBuffer === "function"
  );
}

function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
    ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
  };
  return text
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function seoFilename(context: string | undefined, extension: string): string {
  const slug = context ? transliterate(context) : "";
  const short = randomUUID().slice(0, 8);
  return slug ? `${slug}-${short}${extension}` : `${Date.now()}-${short}${extension}`;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");

export async function saveUploadedImage(value: unknown, seoContext?: string) {
  if (!isUploadedFile(value)) return null;
  if (!value.name && !value.size) return null;
  if ((value.size ?? 0) <= 0) return null;
  if ((value.size ?? 0) > 5 * 1024 * 1024) throw new Error("Файл слишком большой (макс. 5 МБ)");

  const fallbackExt = extname(value.name ?? "").toLowerCase();
  const extension = allowedTypes.get(value.type ?? "") || ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(fallbackExt) ? fallbackExt : null);
  if (!extension) throw new Error("Неподдерживаемый формат изображения");

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = seoFilename(seoContext, extension === ".jpeg" ? ".jpg" : extension);
  const bytes = Buffer.from(await value.arrayBuffer());
  await writeFile(join(UPLOAD_DIR, filename), bytes);

  return `/uploads/${filename}`;
}
