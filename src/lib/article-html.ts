import sanitizeHtml from "sanitize-html";

const blockHtmlTagPattern = /<\/?(p|h[1-6]|ul|ol|li|blockquote|img|hr|div)\b/i;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function internalHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//")) return href;

  try {
    const url = new URL(href);
    if (url.hostname === "mycamdesk.com" || url.hostname === "www.mycamdesk.com") {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

function transformArticleLink(tagName: string, attribs: sanitizeHtml.Attributes) {
  const href = String(attribs.href || "").trim();
  const localHref = internalHref(href);
  const nextAttribs: Record<string, string> = localHref
    ? { href: localHref }
    : { ...attribs, rel: "nofollow noopener noreferrer", target: "_blank" };

  return { tagName, attribs: nextAttribs };
}

function sanitizeLegacyInline(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ["a", "strong", "em", "u", "br"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    disallowedTagsMode: "escape",
    transformTags: { a: transformArticleLink }
  });
}

export function isHtmlArticleBody(body: string) {
  return blockHtmlTagPattern.test(body);
}

export function stripArticleHtml(body: string) {
  return sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeArticleHtml(body: string) {
  return sanitizeHtml(body, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "img", "hr"],
    allowedAttributes: {
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"]
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$/, /^center$/, /^right$/]
      }
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: {
      img: ["http", "https"]
    },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    transformTags: {
      a: transformArticleLink
    },
    exclusiveFilter(frame) {
      if (frame.tag === "img") {
        const src = String(frame.attribs.src || "");
        return !src.startsWith("/media/") && !src.startsWith("/uploads/") && !src.startsWith("https://") && !src.startsWith("http://");
      }

      return false;
    }
  }).trim();
}

function legacyBlockToHtml(block: string) {
  const imageMatch = block.match(/^!\[(.*?)\]\((\/(?:uploads|media)\/[^)\s]+|https?:\/\/[^)\s]+)\)$/);
  if (imageMatch) {
    const src = escapeHtml(imageMatch[2].replace("/uploads/", "/media/"));
    const alt = escapeHtml(imageMatch[1] || "Изображение статьи");
    return `<img src="${src}" alt="${alt}">`;
  }

  if (block.startsWith("- ")) {
    const items = block
      .split("\n")
      .map((item) => item.replace(/^-\s*/, "").trim())
      .filter(Boolean)
      .map((item) => `<li>${sanitizeLegacyInline(item)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  if (block.startsWith("“") || block.startsWith(">")) {
    return `<blockquote>${sanitizeLegacyInline(block.replace(/^>\s*/, ""))}</blockquote>`;
  }

  const isHeading = block.length <= 80 && !/[.!?]$/.test(block) && !block.includes("\n");
  if (isHeading) return `<h2>${sanitizeLegacyInline(block)}</h2>`;

  return `<p>${sanitizeLegacyInline(block.replace(/\n/g, "<br>"))}</p>`;
}

export function articleBodyToHtml(body: string) {
  if (isHtmlArticleBody(body)) return sanitizeArticleHtml(body);

  const html = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(legacyBlockToHtml)
    .join("");

  return sanitizeArticleHtml(html);
}

export function normalizeArticleBody(value: FormDataEntryValue | null, fallback = "") {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  if (isHtmlArticleBody(raw)) {
    return sanitizeArticleHtml(raw);
  }

  return raw
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}
