import { AccountMode, ProfileKind } from "@prisma/client";

// Модель и оператор — «ищущие» (индивидуалы). Все остальные роли — «предлагающие»
// (работодатели/поставщики), которым доступна публикация вакансий и услуг.
const SEEKER_KINDS: ProfileKind[] = ["MODEL", "OPERATOR"];

export function isProviderKind(profileKind?: ProfileKind | string | null): boolean {
  if (!profileKind) return false;
  return !SEEKER_KINDS.includes(profileKind as ProfileKind);
}

// accountMode больше не выбирается пользователем — он вычисляется из роли.
export function accountModeFromKind(profileKind?: ProfileKind | string | null): AccountMode {
  return isProviderKind(profileKind) ? "PROVIDER" : "CONSUMER";
}

// Подпись роли в UI (сгруппированная: агентство → студия, коуч/юрист/др. → специалист).
export function roleLabel(profileKind?: ProfileKind | string | null): string {
  switch (profileKind) {
    case "MODEL":
      return "Модель";
    case "OPERATOR":
      return "Оператор";
    case "STUDIO":
    case "AGENCY":
      return "Студия / Агентство";
    default:
      return "Специалист";
  }
}

// 4 варианта для формы регистрации/профиля. value — представительное значение enum.
export const roleOptions: { value: ProfileKind; label: string }[] = [
  { value: "MODEL", label: "Модель" },
  { value: "OPERATOR", label: "Оператор" },
  { value: "STUDIO", label: "Студия / Агентство" },
  { value: "EXPERT", label: "Специалист" }
];

// Какое значение выбрать в селекте по умолчанию для существующего пользователя,
// чей profileKind может быть из «старых» значений (AGENCY, COACH, LAWYER, OTHER).
export function roleSelectValue(profileKind?: ProfileKind | string | null): ProfileKind {
  switch (profileKind) {
    case "MODEL":
    case "OPERATOR":
    case "STUDIO":
      return profileKind;
    case "AGENCY":
      return "STUDIO";
    default:
      return "EXPERT";
  }
}
