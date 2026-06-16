export function cleanText(value: FormDataEntryValue | null, max = 1000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function cleanMultiline(value: FormDataEntryValue | null, max = 8000) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

export function requireText(value: FormDataEntryValue | null, label: string, max = 1000) {
  const text = cleanText(value, max);
  if (!text) throw new Error(`Заполните поле: ${label}`);
  return text;
}

export function requireMultiline(value: FormDataEntryValue | null, label: string, max = 8000) {
  const text = cleanMultiline(value, max);
  if (!text) throw new Error(`Заполните поле: ${label}`);
  return text;
}

export function optionalUrl(value: FormDataEntryValue | null, max = 500) {
  const text = cleanText(value, max);
  if (!text) return null;
  if ((text.startsWith("/media/") || text.startsWith("/uploads/")) && !text.includes("..")) return text;

  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function cleanNumber(value: FormDataEntryValue | null, min = 0, max = 600) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

export function makeSlug(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9а-я]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${base || "material"}-${Date.now()}`;
}

export function maskContact(contact: string | null | undefined) {
  const value = String(contact || "").trim();
  if (!value) return "-";
  if (value.startsWith("@")) return `${value.slice(0, Math.min(4, value.length))}***`;
  const [name, domain] = value.split("@");
  if (domain) return `${name.slice(0, 2)}***@${domain}`;
  return `${value.slice(0, 4)}***`;
}
