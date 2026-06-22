# Рекомендации по SEO

Дата аудита: 2026-06-21.

Production: https://journal-bice-seven.vercel.app

## Текущее состояние

- `robots.txt` открыт для публичных страниц.
- Закрыты приватные зоны: `/admin`, `/cabinet`, `/auth`, `/api`.
- `sitemap.xml` работает, проверено 52 URL, битых страниц не найдено.
- На ключевых страницах нет `noindex`.
- У основных страниц есть `title`, `description`, `canonical`.
- Есть `llms.txt` для LLM-краулеров.
- Товары, вакансии, услуги, резюме, статьи и профили попадают в sitemap.
- С 2026-06-21 публичные детальные страницы используют SEO URL с транслитом и коротким ID:
  - статьи: `/articles/{shortId}-{translit-title}`;
  - вакансии: `/rabota/{title}-vebcam-studii-{city}-{shortId}`;
  - услуги: `/uslugi/{title}-dlya-vebcam-{city}-{shortId}`;
  - товары: `/tovar/{title}-{category}-dlya-vebcam-modeli-{city}-{shortId}`;
  - резюме: `/resume/{role-title}-vebcam-model-{city}-{shortId}`.
- Старые ID-ссылки остаются рабочими и редиректят на новый canonical.
- Поиск `site:journal-bice-seven.vercel.app` пока не показывает стабильной индексации, значит сайт, скорее всего, еще не успел нормально попасть в индекс.

## Главные проблемы

1. Услуги больше не должны размечаться как `JobPosting`: для них добавлена базовая schema `Service` + `Offer`.
   Что можно улучшить позже:
   - добавить рейтинг услуги в schema после накопления отзывов;
   - добавить более чистую числовую цену, если в форме цены появится отдельное поле.

2. Вакансии размечены `JobPosting`, но schema еще можно расширять.
   Нужно добавить:
   - `baseSalary`, если в вакансии указана зарплата;
   - `hiringOrganization.logo` и `sameAs`, если появятся.

3. Товары размечены базово и дополнены `image`, `category`, `sku`, `itemCondition`, `seller`, `priceValidUntil`.
   Сейчас есть:
   - `Product`;
   - `Offer`;
   - цена;
   - валюта `RUB`;
   - availability;
   - URL.

   Нужно добавить позже:
   - `aggregateRating` и `review`, когда появятся отзывы.

4. Для резюме добавлены отдельные публичные SEO-страницы `/resume/...` со schema `ProfilePage` + `Person` и добавлением в sitemap.
   Позже можно добавить более структурированные поля: языки, график, желаемая зарплата отдельным полем.

## Приоритеты

1. Доработать `JobPosting` для вакансий под Google Jobs: отдельная зарплата, logo/sameAs организации, Indexing API.

2. Доработать отзывы/рейтинг для услуг и товаров в schema.

3. Подключить:
   - Google Search Console;
   - Яндекс Вебмастер;
   - отправку sitemap;
   - Google Indexing API для вакансий.

## Важные правила

- Для вакансий Google рекомендует не только sitemap, но и Indexing API, чтобы быстрее сообщать о новых и измененных вакансиях.
- Вакансия должна быть доступна без логина, не закрыта robots.txt и без `noindex`.
- Если вакансия удалена или ушла в архив, ее нужно убрать из sitemap или отдать корректный статус/архивное состояние.
- В `JobPosting.title` не стоит добавлять зарплату, город, капс, рекламные символы и лишние призывы.
- Для удаленной вакансии нужно явно указывать удаленный формат в schema, а не только в тексте.
- Товарные страницы для Google/Yandex лучше размечать максимально полно: цена, валюта, наличие, состояние, изображение, продавец, срок актуальности цены.
- Schema должна соответствовать видимому контенту на странице.

## Официальные источники

- Google JobPosting: https://developers.google.com/search/docs/appearance/structured-data/job-posting
- Google Product structured data: https://developers.google.com/search/docs/appearance/structured-data/product
- Google Merchant listing: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Яндекс Schema.org: https://yandex.ru/support/webmaster/ru/schema-org/what-is-schema-org.html
