# Git Workflow — MyCamDesk

## Правило №1: НИКОГДА не коммитить в main напрямую

Main — это production. Каждый push в main = деплой на mycamdesk.com.

## Начало новой задачи

```bash
git checkout main
git pull origin main
git checkout -b feature/название-задачи
```

Примеры имён веток:
- `feature/quiz-rebuild` — новая фича
- `fix/avatar-upload` — багфикс
- `refactor/admin-layout` — рефакторинг

## Работа над задачей

```bash
# Пишешь код, коммитишь
git add -A
git commit -m "Описание изменения"
git push origin feature/название-задачи
```

Push в feature-ветку НЕ деплоит никуда. Можно пушить сколько угодно.

## Тестирование

Для тестирования на dev.mycamdesk.com:
```bash
git checkout dev
git merge feature/название-задачи
git push origin dev
```
Это задеплоит на тестовый сайт. Проверяешь — если ок, идёшь дальше.

## Релиз в production

**Через GitHub PR (рекомендуется):**
1. На GitHub: Create Pull Request из `feature/название-задачи` в `main`
2. Проверить diff, убедиться что всё ок
3. Merge Pull Request
4. GitHub Actions автоматически деплоит на production

**Через командную строку:**
```bash
git checkout main
git pull origin main
git merge feature/название-задачи
git push origin main
```

## После релиза

```bash
# Удалить feature-ветку
git branch -d feature/название-задачи
git push origin --delete feature/название-задачи
```

## Правила для AI-агента

- **ЧИТАЙ этот файл** перед началом любой задачи
- Создай feature-ветку ДО первого коммита
- НЕ коммить в main напрямую
- НЕ запускай код на сервере через SSH
- НЕ делай `git push origin main` пока задача не протестирована
- Деплой на сервер происходит ТОЛЬКО через GitHub Actions при push в main/dev

## Сервер — READ ONLY

SSH к серверу `185.112.83.74` используется ТОЛЬКО для:
- `pm2 logs site` — просмотр логов
- `pm2 list` — статус процессов
- `psql` — просмотр данных в БД

ЗАПРЕЩЕНО на сервере:
- `git pull/push`
- `npm install/build`
- `pm2 restart`
- Редактирование любых файлов
- Изменение .env.local
- Изменение nginx конфигов
