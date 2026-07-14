const routeLabels: Record<string, string> = {
  "/": "Главная",
  "/articles": "Лента статей",
  "/guides": "Все гайды",
  "/vacancies": "Вакансии",
  "/resumes": "Резюме",
  "/services": "Услуги",
  "/products": "Товары",
  "/model-operator": "Модель и оператор",
  "/links": "Полезные ссылки",
  "/authors": "Авторы"
};

export function relatedLinkLabel(href: string) {
  const normalized = href.split("?")[0].replace(/\/$/, "") || "/";
  if (routeLabels[normalized]) return routeLabels[normalized];

  const tail = normalized.split("/").filter(Boolean).at(-1);
  if (!tail) return "Связанная страница";

  const text = decodeURIComponent(tail)
    .replace(/-([a-z0-9]{6,})$/i, "")
    .replaceAll("-", " ")
    .trim();

  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Связанная страница";
}
