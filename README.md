# BarBoss Inventory Management

Система управления инвентаризацией для баров и ресторанов.

## Технологии

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Firebase/Firestore** - Backend и база данных
- **Tailwind CSS** - Стилизация
- **Radix UI** - UI компоненты
- **Zod** - Валидация данных
- **Genkit AI / Google Gemini** - AI-анализ отклонений инвентаризации

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

Приложение будет доступно на [http://localhost:3000](http://localhost:3000)

## Сборка

```bash
npm run build
npm start
```

## Структура проекта

```
src/
├── app/              # Next.js App Router страницы
├── components/       # React компоненты
├── contexts/        # React контексты для глобального состояния
├── firebase/        # Firebase конфигурация и хуки
├── hooks/           # Кастомные React хуки
├── lib/             # Утилиты и бизнес-логика
│   ├── schemas/     # Zod схемы валидации
│   └── types.ts     # TypeScript типы
└── components/ui/   # Базовые UI компоненты
```

## Основные функции

- **Управление продуктами** - Каталог товаров с категориями
- **Инвентаризация** - Создание и управление сессиями инвентаризации
- **AI-анализ отклонений** - Автоматический анализ причин отклонений с использованием ИИ (Google Gemini)
- **Калькулятор** - Расчет остатков в бутылках
- **Заказы на закупку** - Автоматическое создание заказов на основе остатков
- **Аналитика** - Отчеты и анализ потерь с графиками
- **Экспорт отчетов** - Экспорт в CSV и Excel (.xlsx) форматы

## Безопасность

- Firestore Security Rules для контроля доступа
- Валидация данных на клиенте и сервере
- Error boundaries для обработки ошибок

## Производительность

- Кэширование данных в localStorage
- Оптимизированные Firestore запросы с индексами
- Code splitting для уменьшения bundle size
- Real-time обновления через onSnapshot
- Мемоизация тяжелых вычислений с useMemo

## Настройка переменных окружения

Создайте файл `.env.local` в корне проекта со следующими переменными:

```env
# Firebase Configuration (уже настроено в firebase/config.ts)
# Если нужно переопределить, используйте:
# NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Google Generative AI (для AI-анализа отклонений)
# Получите API ключ: https://makersuite.google.com/app/apikey
GOOGLE_GENAI_API_KEY=your_google_genai_api_key_here
```

**Важно:** AI-анализ будет работать без API ключа, но использует упрощенный fallback-анализ.

## Настройка Firestore индексов

Приложение требует следующие composite индексы в Firestore. Они определены в `firestore.indexes.json`:

1. `inventorySessions` - для запросов с `status == 'completed'` и `orderBy('closedAt', 'desc')`
2. `inventorySessions` - для запросов с `status == 'completed'` и `orderBy('createdAt', 'desc')`
3. `purchaseOrders` - для запросов с `orderBy('orderDate', 'desc')`

Для создания индексов:
1. Используйте Firebase CLI: `firebase deploy --only firestore:indexes`
2. Или создайте индексы вручную через Firebase Console

## Лицензия

Private
