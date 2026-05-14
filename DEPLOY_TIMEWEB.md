# Деплой с PostgreSQL на Timeweb Cloud (Next.js + Prisma)

## 1) Создать PostgreSQL в Timeweb Cloud

- Регион: **тот же**, что у приложения.
- Сеть: **приватная сеть** (если приложение тоже в Timeweb Cloud) — предпочтительно.
- Бэкапы: **включить**.

Сохраните параметры подключения (host/port/db/user/password).

## 2) Настроить переменные окружения

На стороне Timeweb Cloud (в переменных окружения сервиса приложения) добавьте:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

Рекомендуется использовать **приватный адрес** БД (если есть), а не публичный.

`FIREBASE_SERVICE_ACCOUNT_KEY` нужен для серверных API-роутов (они проверяют Firebase ID token).

## 3) Прогнать миграции схемы перед запуском приложения

Локально (первый раз, когда схема ещё не создана):

```bash
npm run db:migrate:dev
```

На сервере (при деплое):

```bash
npm run db:migrate:deploy
```

## 4) Миграция данных Firestore -> Postgres (если нужна)

Скрипт миграции (на старте переносит коллекцию `products`):

```bash
npm run db:migrate:data
```

Требуется один из вариантов:
- `FIREBASE_SERVICE_ACCOUNT_KEY` в окружении (JSON строкой)
- или файл `serviceAccountKey.json` в корне проекта (только локально, не коммитить)

## 5) Проверка

- `npm run db:studio` (локально) — убедиться, что таблицы/данные появились
- сборка и старт:
  - `npm run build`
  - `npm run start`

## Smoke test (после деплоя на Timeweb)

- Зайти в `/dashboard/products` — должны загрузиться ваши продукты
- Зайти в `/dashboard/products/library` — должна загрузиться библиотека
- Создать/редактировать/удалить продукт — изменения должны сохраняться
- Зайти в `/dashboard/suppliers` — список поставщиков должен загрузиться


