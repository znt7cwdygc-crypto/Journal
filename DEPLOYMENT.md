# Бесплатная выкладка MVP

Рекомендуемая схема для первого публичного теста:

- Vercel — хостинг Next.js и публичная ссылка.
- Neon — PostgreSQL для Prisma.
- Встроенные файловые загрузки временно не использовать на Vercel без внешнего хранилища.

## 1. Подготовить базу Neon

1. Зарегистрируйтесь на https://neon.com.
2. Создайте новый проект PostgreSQL.
3. Скопируйте строку подключения `DATABASE_URL`.
4. В строке подключения должен быть `sslmode=require`.

## 2. Подготовить Vercel

1. Загрузите проект в GitHub.
2. В Vercel нажмите `Add New Project`.
3. Импортируйте репозиторий.
4. Framework Preset: `Next.js`.
5. Build Command будет взят из `vercel.json`: `npm run vercel-build`.

## 3. Переменные окружения Vercel

В Vercel Project Settings -> Environment Variables добавьте:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="long-random-secret"
NEXTAUTH_SECRET="same-long-random-secret"
NEXTAUTH_URL="https://your-project.vercel.app"
NEXT_PUBLIC_SITE_URL="https://your-project.vercel.app"
CRON_SECRET="long-random-cron-secret"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="strong-password"
USDT_TRC20_WALLET=""
```

После первого деплоя замените `your-project.vercel.app` на реальный URL проекта.

## 4. Применить миграции Prisma

После создания Neon-базы нужно один раз применить миграции:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Если нужно создать стартовые тестовые данные:

```bash
DATABASE_URL="postgresql://..." npm run seed
```

Не запускайте seed на боевом проекте, если там уже есть реальные пользователи.

## 5. Картинки и загрузки

Сейчас локальная разработка сохраняет файлы в `public/uploads`.

На Vercel такой способ нельзя считать постоянным хранилищем: серверные файлы не должны использоваться как база для пользовательских загрузок. Поэтому в продакшене загрузка файла вернет понятную ошибку, если не подключено внешнее хранилище.

Для публичного MVP есть два варианта:

- Временно использовать URL картинки в редакторе, без загрузки файла.
- Подключить Vercel Blob или Cloudinary и заменить `src/lib/uploaded-image.ts` на сохранение во внешнее хранилище.

## 6. Проверка после деплоя

Проверьте по публичной ссылке:

- главная открывается без `Application error`;
- регистрация и вход работают;
- можно написать статью;
- можно сохранить черновик;
- можно создать резюме;
- можно создать вакансию или услугу;
- карточки открываются по `/articles/{id}` и `/listings/{id}`;
- `/robots.txt`, `/sitemap.xml`, `/llms.txt` открываются.

## 7. Ограничение бесплатного запуска

Бесплатная схема подходит для MVP, тестов и первых пользователей. Для коммерческого запуска на своем домене лучше перейти на платный план Vercel и подключить постоянное хранилище файлов.
