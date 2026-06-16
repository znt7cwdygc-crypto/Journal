export function articleTopic(title: string, body: string): string {
  const text = `${title} ${body}`.toLowerCase();
  if (/(деньг|доход|зарплат|выплат|комисс|финанс)/.test(text)) return "Деньги";
  if (/(безопас|договор|риски|чек-лист|чеклист|приват|скам|защит)/.test(text)) return "Безопасность";
  if (/(ваканс|работ|карьер|резюме|график)/.test(text)) return "Работа";
  if (/(студи|команд|офис|работодател)/.test(text)) return "Студии";
  if (/(разбор|ошиб|кейс)/.test(text)) return "Разборы";
  if (/(инструмент|obs|камера|свет|техник|контент|план|kpi)/.test(text)) return "Инструменты";
  if (/[?？]|вопрос|спросить/.test(text)) return "Вопросы";
  return "Истории";
}

export function vacancyTopic(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/(оператор|чат|support|саппорт)/.test(text)) return "Операторы и саппорт";
  if (/(админ|администратор|менеджер)/.test(text)) return "Администрирование";
  if (/(трафик|маркет|аналит)/.test(text)) return "Трафик и маркетинг";
  return "Другие вакансии";
}

export function serviceTopic(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/(коуч|настав|ментор)/.test(text)) return "Коучинг и развитие";
  if (/(obs|свет|тех|настрой)/.test(text)) return "Техническая настройка";
  if (/(резюме|упаков|презентац)/.test(text)) return "Резюме и самопрезентация";
  return "Другие услуги";
}

export function resumeTopic(roleGoal: string, bio: string): string {
  const text = `${roleGoal} ${bio}`.toLowerCase();
  if (/(модель)/.test(text)) return "Кандидаты: модели";
  if (/(оператор|чат)/.test(text)) return "Кандидаты: операторы";
  if (/(админ|администратор|саппорт)/.test(text)) return "Кандидаты: админы";
  return "Кандидаты: другие роли";
}
