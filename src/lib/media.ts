const blockedImageHosts = new Set(["example.com", "example.org", "example.net"]);

export function safeImageUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("/media/") && !value.includes("..")) return value;
  if (value.startsWith("/uploads/") && !value.includes("..")) return value;

  try {
    const url = new URL(value);
    if (blockedImageHosts.has(url.hostname.toLowerCase())) return null;
    return value;
  } catch {
    return null;
  }
}
