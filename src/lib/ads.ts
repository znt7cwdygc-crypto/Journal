import { prisma } from "@/lib/prisma";

export const adPlacements = [
  { value: "home", label: "Главная" },
  { value: "articles", label: "Лента" },
  { value: "vacancies", label: "Вакансии" },
  { value: "services", label: "Услуги" },
  { value: "resumes", label: "Резюме" },
  { value: "products", label: "Товары" },
  { value: "model-operator", label: "Модель оператор" },
  { value: "cabinet", label: "Личный кабинет" },
  { value: "authors", label: "Авторы" },
  { value: "links", label: "Полезные ссылки" },
  { value: "sidebar", label: "Боковая панель (все страницы)" }
] as const;

export type AdPlacement = (typeof adPlacements)[number]["value"];

export function normalizeAdPlacement(value: string | null | undefined): AdPlacement {
  return adPlacements.some((placement) => placement.value === value) ? (value as AdPlacement) : "home";
}

export function adPlacementLabel(value: string) {
  return adPlacements.find((placement) => placement.value === value)?.label || value;
}

export const adMonthlyPricesUsd: Record<AdPlacement, number> = {
  home: 150,
  articles: 130,
  vacancies: 110,
  services: 100,
  products: 90,
  resumes: 80,
  "model-operator": 80,
  cabinet: 70,
  authors: 60,
  links: 50,
  sidebar: 200
};

export function adMonthlyPriceUsd(value: string) {
  return adMonthlyPricesUsd[normalizeAdPlacement(value)];
}

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function getAdvertisementForPlacement(placement: AdPlacement) {
  const now = new Date();

  try {
    return await prisma.advertisement.findFirst({
      where: {
        placement,
        status: "ACTIVE",
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
        ]
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
  } catch {
    return null;
  }
}

export function adRevalidatePaths(placement?: string) {
  const common = ["/admin"];
  const map: Record<string, string[]> = {
    home: ["/"],
    articles: ["/articles"],
    vacancies: ["/vacancies"],
    services: ["/services"],
    resumes: ["/resumes"],
    products: ["/products"],
    "model-operator": ["/model-operator"],
    cabinet: ["/cabinet"],
    authors: ["/authors"],
    links: ["/links"],
    sidebar: ["/"]
  };

  return [...common, ...(placement ? map[placement] || [] : Object.values(map).flat())];
}
