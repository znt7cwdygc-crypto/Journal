/** Shared label maps and JSON field types for DirectoryProfile (studio/agency catalog). See docs/STUDIO_CATALOG_SPEC.md. */

export type TeamComposition = {
  admins?: number;
  operators?: number;
  femaleCount?: number;
  maleCount?: number;
  hasTrainer?: boolean;
  trainerNote?: string | null;
};

export type Penalty = { label: string };

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const studioPlatforms = ["CHATURBATE", "STRIPCHAT", "BONGACAMS", "LIVEJASMIN"];
export const agencyPlatforms = ["ONLYFANS", "FANSLY", "LOYALFANS", "FANVUE"];

export const workFormatOptions = [
  { value: "OFFLINE", label: "Офлайн" },
  { value: "ONLINE", label: "Онлайн" },
  { value: "HYBRID", label: "Гибрид" },
];

export const audienceOptions = [
  { value: "WOMEN", label: "Девушки" },
  { value: "MEN", label: "Парни" },
  { value: "COUPLES", label: "Пары" },
  { value: "NEWCOMERS", label: "Новички" },
];

export const agencyIncludeOptions = [
  { value: "CHATTING_24_7", label: "Переписка 24/7" },
  { value: "PROMOTION", label: "Продвижение (Reddit/X)" },
  { value: "CONTENT_PLAN", label: "Контент-план / съёмки" },
  { value: "PAYOUT_PAXUM", label: "Официальный Paxum" },
];

function labelFromOptions(options: { value: string; label: string }[], value: string) {
  return options.find((opt) => opt.value === value)?.label || value;
}

export function workFormatLabel(value: string) {
  return labelFromOptions(workFormatOptions, value);
}

export function audienceLabel(value: string) {
  return labelFromOptions(audienceOptions, value);
}

export function agencyIncludeLabel(value: string) {
  return labelFromOptions(agencyIncludeOptions, value);
}

export function platformLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
