export function safeInternalPath(value: string, fallback = "/articles") {
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
