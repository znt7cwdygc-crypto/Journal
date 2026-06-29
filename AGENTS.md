# AGENTS.md

Короткий контекст для каждой новой сессии с любым AI-агентом.

## Проект

MyCamDesk — мобильное UGC-медиа и комьюнити о вебкам-индустрии и контент-платформах (OnlyFans, Fansly и др.). Ориентиры: vc.ru и Т-Ж. Главная ценность: живые статьи, личные истории, обсуждения, резюме, вакансии, услуги, профили авторов и доверие внутри сообщества.

Аудитория в основном заходит со смартфона — мобильный UX важнее десктопа.

## Бренд

- Название: **MyCamDesk**
- Домен: **mycamdesk.com**
- Логотип: красный квадрат с буквой "M" + текст "CamDesk"
- Тестовый сайт: **dev.mycamdesk.com**

## Технический стек

- Next.js 14 App Router + TypeScript
- Prisma ORM + PostgreSQL (локальная на сервере)
- NextAuth v5 (credentials, bcrypt)
- Tailwind CSS + дизайн-система (btn, card, badge классы)
- TipTap WYSIWYG редактор статей
- Resend — email-уведомления
- PM2 — менеджер процессов
- Nginx — reverse proxy + SSL (Let's Encrypt) + статика
- GitHub Actions — автодеплой

## Инфраструктура

- **Production сервер**: `185.112.83.74` (DigitalOcean / ihor-hosting, Ubuntu)
- **Тестовый сервер**: тот же IP, порт 3001
- **Домен DNS**: Cloudflare (DNS only, без прокси)
- **БД**: PostgreSQL локальная на сервере (не Neon)
- **Файлы**: `/var/www/uploads/` — Nginx отдаёт напрямую
- **Env**: `/opt/env.production` — безопасная копия .env.local
- **GitHub**: `znt7cwdygc-crypto/Journal`

## Деплой — СТРОГО

⚠️ **НИКОГДА не заливать код напрямую на сервер через SSH.** Деплой ТОЛЬКО через GitHub:

1. Редактировать код ЛОКАЛЬНО в `/Users/vladislav/Downloads/journal-repo`
2. `git add + git commit + git push origin dev` → автодеплой на тестовый сайт
3. Проверить на `dev.mycamdesk.com`
4. `git checkout main && git merge dev && git push origin main` → автодеплой на production

GitHub Actions (`.github/workflows/deploy.yml`) делает всё автоматически:
- Клонирует → npm install → prisma generate → prisma db push → npm run build → swap → pm2 restart
- Zero-downtime: build в temp папке, swap мгновенный

⚠️ **НЕ запускать `npm run build`, `pm2 restart`, `git pull` на сервере вручную.**
⚠️ **НЕ редактировать файлы на сервере.** Все изменения — через git.

SSH к серверу используется ТОЛЬКО для:
- Проверки логов: `ssh root@185.112.83.74 "pm2 logs site --lines 20 --nostream"`
- Миграций БД: `ssh root@185.112.83.74 "cd /opt/site && DATABASE_URL=... npx prisma db push"`
- Проверки состояния: `ssh root@185.112.83.74 "pm2 list"`

## Базовые принципы

- Сначала проверять текущий вид и поведение, потом менять
- Не ломать существующие сценарии ради визуальной правки
- Мобильный UX — приоритет. Каждый квиз-шаг на одном экране
- Важные действия должны реально работать
- Перед изменениями прочитать `PROJECT_CONTEXT.md`
- После значимых изменений обновить `PROJECT_CONTEXT.md`

## Рабочий флоу для новых фич

1. НЕ ПИШИ КОД СРАЗУ — задай 3-5 уточняющих вопросов
2. Выдай Микро-ТЗ: цель, файлы, проверка
3. Только потом код

## Правило безопасности

Перед изменением UI/логики — прочитать `PROJECT_CONTEXT.md`. Не предлагать решения, противоречащие записям в нём.

## Ключевые файлы

- `PROJECT_CONTEXT.md` — история решений, что реализовано, что не трогать
- `prisma/schema.prisma` — модель данных (20+ таблиц)
- `src/app/actions.ts` — все server actions (~2000 строк)
- `src/lib/quizzes/` — данные квизов (резюме, вакансии, услуги)
- `src/components/model-resume-form.tsx` — квиз резюме (модель + специалист)
- `src/components/listing-quiz-form.tsx` — квизы вакансий и услуг
- `content-plan/quiz-structure.xlsx` — таблица всех квизов для редактирования
- `.github/workflows/deploy.yml` — автодеплой
