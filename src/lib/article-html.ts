import sanitizeHtml from "sanitize-html";

const htmlTagPattern = /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|u|a|img|hr|br|div|span)\b/i;

export function isHtmlArticleBody(body: string) {
  return htmlTagPattern.test(body);
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
      a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener noreferrer", target: "_blank" }, true)
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
