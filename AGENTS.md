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

## Деплой

- `git push origin main` → GitHub Actions → zero-downtime deploy на production
- `git push origin dev` → GitHub Actions → deploy на dev.mycamdesk.com
- Проверил на dev → `git checkout main && git merge dev && git push origin main`

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
