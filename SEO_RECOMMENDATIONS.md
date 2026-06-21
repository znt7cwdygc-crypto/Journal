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
- Поиск `site:journal-bice-seven.vercel.app` пока не показывает стабильной индексации, значит сайт, скорее всего, еще не успел нормально попасть в индекс.

## Главные проблемы

1. Услуги сейчас размечаются как `JobPosting`, потому что общая страница `/listings/[id]` использует `JobPosting` для всех listing.
   - Для вакансий это нормально.
   - Для услуг это ошибка.
   - Услуги нужно размечать как `Service` + `Offer`.

2. Вакансии размечены неполным `JobPosting`.
   Нужно добавить:
   - `validThrough` из `expiresAt`;
   - `employmentType`;
   - `jobLocation.address.addressCountry`, минимум `RU`;
   - `addressLocality` для города;
   - для удаленки `jobLocationType: TELECOMMUTE`;
   - для удаленки `applicantLocationRequirements`;
   - `baseSalary`, если в вакансии указана зарплата;
   - `identifier`;
   - `hiringOrganization.logo` и `sameAs`, если появятся.

3. Товары размечены базово, но не полностью.
   Сейчас есть:
   - `Product`;
   - `Offer`;
   - цена;
   - валюта `RUB`;
   - availability;
   - URL.

   Нужно добавить:
   - `image`;
   - `itemCondition`;
   - `priceValidUntil`;
   - `seller`;
   - `category`;
   - `sku` или внутренний `identifier`;
   - `aggregateRating` и `review`, когда появятся отзывы.

4. Резюме пока индексируются только через общий каталог и SEO-лендинги.
   Лучше добавить отдельные публичные страницы резюме:
   - `/resumes/{id}`;
   - schema `ProfilePage` + `Person`;
   - `jobTitle`;
   - город/регион;
   - опыт;
   - языки;
   - описание;
   - canonical;
   - добавление в sitemap.

## Приоритеты

1. Исправить schema для `/listings/[id]`:
   - вакансии: `JobPosting`;
   - услуги: `Service` + `Offer`.

2. Доработать `JobPosting` для вакансий под Google Jobs.

3. Доработать `Product` schema для товаров.

4. Сделать индивидуальные страницы резюме и schema `ProfilePage`/`Person`.

5. Подключить:
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
