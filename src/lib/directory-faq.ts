type FaqProfile = {
  type: "STUDIO" | "AGENCY" | string;
  name: string;
  city: string | null;
  percentMin: number | null;
  percentMax: number | null;
  agencySharePercent: number | null;
  payoutSchedule: string | null;
  verificationStatus: string;
};

export function quickAnswer(profile: FaqProfile) {
  const isStudio = profile.type === "STUDIO";
  const place = profile.city || "работает онлайн";
  const money = isStudio
    ? profile.percentMin != null
      ? `модель получает ${profile.percentMin}${profile.percentMax ? `-${profile.percentMax}` : ""}%`
      : null
    : profile.agencySharePercent != null
      ? `доля агентства ${profile.agencySharePercent}%`
      : null;

  return [
    `${profile.name} — ${isStudio ? "вебкам-студия" : "агентство контент-платформ"}, ${place}.`,
    money ? `${money[0].toUpperCase()}${money.slice(1)}.` : null,
    profile.verificationStatus === "VERIFIED" ? "Контакты и деятельность проверены редакцией." : null
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildFaq(profile: FaqProfile) {
  const isStudio = profile.type === "STUDIO";
  const items: { question: string; answer: string }[] = [];

  if (isStudio && profile.percentMin != null) {
    items.push({
      question: `Какой процент у студии «${profile.name}»?`,
      answer: profile.percentMax
        ? `Модель получает от ${profile.percentMin}% до ${profile.percentMax}% в зависимости от условий.`
        : `Модель получает ${profile.percentMin}%.`
    });
  }
  if (!isStudio && profile.agencySharePercent != null) {
    items.push({
      question: `Какая доля у агентства «${profile.name}»?`,
      answer: `Агентство берёт ${profile.agencySharePercent}% от дохода модели.`
    });
  }
  if (isStudio && profile.payoutSchedule) {
    items.push({ question: "Как часто выплаты?", answer: profile.payoutSchedule });
  }
  items.push({
    question: `Как связаться с «${profile.name}»?`,
    answer: "Контакт для отклика открывается после входа в аккаунт на MyCamDesk."
  });
  items.push({
    question: `Проверена ли организация «${profile.name}»?`,
    answer:
      profile.verificationStatus === "VERIFIED"
        ? "Да, редакция MyCamDesk подтвердила контакты и факт деятельности. Это не гарантия условий или безопасности."
        : "Профиль пока не прошёл проверку редакции MyCamDesk."
  });

  return items;
}
