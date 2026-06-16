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

export async function saveUploadedImage(value: unknown) {
  if (!isUploadedFile(value)) return null;
  if (!value.name && !value.size) return null;
  if ((value.size ?? 0) <= 0) return null;
  if ((value.size ?? 0) > 5 * 1024 * 1024) throw new Error("Файл обложки слишком большой");
  if (process.env.VERCEL === "1" && process.env.ENABLE_VERCEL_LOCAL_UPLOADS !== "1") {
    throw new Error("Загрузка файлов на Vercel требует внешнего хранилища. Временно укажите URL картинки.");
  }

  const fallbackExt = extname(value.name ?? "").toLowerCase();
  const extension = allowedTypes.get(value.type ?? "") || ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(fallbackExt) ? fallbackExt : null);
  if (!extension) throw new Error("Неподдерживаемый формат обложки");

  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID()}${extension === ".jpeg" ? ".jpg" : extension}`;
  const bytes = Buffer.from(await value.arrayBuffer());
  await writeFile(join(uploadDir, filename), bytes);

  return `/media/${filename}`;
}
