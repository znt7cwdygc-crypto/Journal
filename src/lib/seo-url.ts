type ArticlePathInput = {
  id: string;
  title: string;
};

type ListingPathInput = {
  id: string;
  type: "VACANCY" | "SERVICE" | string;
  title: string;
  city?: string | null;
  employmentType?: string | null;
};

type ProductPathInput = {
  id: string;
  title: string;
  category?: string | null;
  city?: string | null;
};

type ResumePathInput = {
  id: string;
  title: string;
  city?: string | null;
  roleGoal?: string | null;
};

type MatchProfilePathInput = {
  id: string;
  title: string;
  city?: string | null;
  seekerRole?: string | null;
  lookingFor?: string | null;
};

const translitMap: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya"
};

export function seoShortId(id: string) {
  return id.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase();
}

export function slugifyTranslit(value: string, fallback = "webcam") {
  // "вебкам" транслитерируется целиком в "webcam", а не побуквенно (иначе получится "vebkam").
  const withWebcamWord = value.replace(/вебкам/gi, "webcam");
  const raw = withWebcamWord
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] ?? char)
    .join("");
  const slug = raw
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 90)
    .replace(/-+$/g, "");

  return slug || fallback;
}

function citySlug(city?: string | null, employmentType?: string | null) {
  const normalized = (city || "").trim().toLowerCase();
  if (employmentType === "REMOTE" || normalized === "remote" || normalized.includes("удален")) return "udalenno";
  return city ? slugifyTranslit(city, "rossiya") : "rossiya";
}

function includesWebcamKeyword(slug: string) {
  return /\bwebcam\b/.test(slug);
}

function withWebcamKeyword(slug: string, keyword: string) {
  return includesWebcamKeyword(slug) ? slug : `${slug}-${keyword}`;
}

export function articleSeoPath(article: ArticlePathInput) {
  return `/articles/${seoShortId(article.id)}-${slugifyTranslit(article.title, "statya-webcam")}`;
}

export function listingSeoPath(listing: ListingPathInput) {
  const shortId = seoShortId(listing.id);
  const city = citySlug(listing.city, listing.employmentType);
  const base = slugifyTranslit(listing.title, listing.type === "SERVICE" ? "usluga" : "vakansiya");

  if (listing.type === "SERVICE") {
    return `/uslugi/${withWebcamKeyword(base, "dlya-webcam")}-${city}-${shortId}`;
  }

  return `/rabota/${withWebcamKeyword(base, "webcam-studii")}-${city}-${shortId}`;
}

export function productSeoPath(product: ProductPathInput) {
  const title = slugifyTranslit(product.title, "tovar");
  const category = product.category ? slugifyTranslit(product.category, "") : "";
  const city = citySlug(product.city);
  const parts = [title, category, "dlya-webcam-modeli", city, seoShortId(product.id)].filter(Boolean);
  return `/tovar/${parts.join("-")}`;
}

export function resumeSeoPath(resume: ResumePathInput) {
  const role = slugifyTranslit(resume.roleGoal || resume.title, "webcam-model");
  const title = slugifyTranslit(resume.title, "resume");
  const city = citySlug(resume.city);
  return `/resume/${withWebcamKeyword(`${role}-${title}`, "webcam-model")}-${city}-${seoShortId(resume.id)}`;
}

export function matchProfileSeoPath(profile: MatchProfilePathInput) {
  const seeker = profile.seekerRole === "OPERATOR" ? "operator" : "model";
  const lookingFor = profile.lookingFor === "MODEL" ? "model" : profile.lookingFor === "OPERATOR" ? "operator" : "svyazka";
  const title = slugifyTranslit(profile.title, "model-operator");
  const city = citySlug(profile.city);
  return `/svyazki/${seeker}-ischet-${lookingFor}-webcam-${title}-${city}-${seoShortId(profile.id)}`;
}

export function idFromSeoParam(param: string) {
  const clean = decodeURIComponent(param).toLowerCase();
  const directId = clean.match(/^c[a-z0-9]{8,}$/i)?.[0];
  if (directId) return { id: directId, shortId: null };

  const suffix = clean.match(/-([a-z0-9]{8})(?:$|[?#])/)?.[1];
  const articlePrefix = clean.match(/^([a-z0-9]{8})-/)?.[1];
  return { id: null, shortId: suffix || articlePrefix || null };
}

export function pathTail(path: string) {
  return path.split("/").filter(Boolean).pop() || "";
}
