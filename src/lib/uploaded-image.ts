import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";

// Максимальная ширина стороны — сайт нигде не показывает изображения крупнее.
const MAX_DIMENSION = 2000;
const MAX_INPUT_PIXELS = 40_000_000;
const WEBP_QUALITY = 80;

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

  const bytes = Buffer.from(await value.arrayBuffer());
  const expectedFormat = extension === ".jpg" || extension === ".jpeg" ? "jpeg" : extension.slice(1);
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(bytes, { animated: extension === ".gif", limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new Error("Файл поврежден или не является изображением");
  }
  if (metadata.format !== expectedFormat) throw new Error("Содержимое файла не соответствует его формату");
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new Error("Слишком большое разрешение изображения");
  }
  if ((metadata.pages ?? 1) > 200) throw new Error("В GIF слишком много кадров");

  // Анимированный GIF пережимать нельзя (потеряет анимацию) — сохраняем как есть.
  // Остальные форматы: сжимаем и переводим в WebP, чтобы вес файла упал в разы.
  if (extension === ".gif") {
    const filename = seoFilename(seoContext, extension);
    await writeFile(join(UPLOAD_DIR, filename), bytes);
    return `/uploads/${filename}`;
  }

  const filename = seoFilename(seoContext, ".webp");
  const compressed = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate() // учитывает EXIF-ориентацию перед ресайзом
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  await writeFile(join(UPLOAD_DIR, filename), compressed);

  return `/uploads/${filename}`;
}
