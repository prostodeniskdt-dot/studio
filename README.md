# BarBoss Inventory Management

Система управления инвентаризацией для баров и ресторанов.

## Технологии

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Firebase/Firestore** - Backend и база данных
- **Tailwind CSS** - Стилизация
- **Radix UI** - UI компоненты
- **Zod** - Валидация данных

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
- **Калькулятор** - Расчет остатков в бутылках
- **Заказы на закупку** - Автоматическое создание заказов
- **Аналитика** - Отчеты и анализ потерь

## Безопасность

- Firestore Security Rules для контроля доступа
- Валидация данных на клиенте и сервере
- Error boundaries для обработки ошибок

## Производительность

- Кэширование данных в localStorage
- Оптимизированные Firestore запросы
- Code splitting для уменьшения bundle size
- Real-time обновления через onSnapshot

## Лицензия

Private
