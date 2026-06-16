export const CITY_COOKIE = "we_city";

export const CITY_OPTIONS = [
  { label: "Москва", value: "moscow", geoCode: "moscow,ru" },
  { label: "Санкт-Петербург", value: "saint-petersburg", geoCode: "saint petersburg,ru" },
  { label: "Казань", value: "kazan", geoCode: "kazan,ru" },
  { label: "Екатеринбург", value: "yekaterinburg", geoCode: "yekaterinburg,ru" },
  { label: "Минск", value: "minsk", geoCode: "minsk,by" },
  { label: "Удаленно", value: "remote", geoCode: "remote" }
] as const;

export type CityValue = (typeof CITY_OPTIONS)[number]["value"];
