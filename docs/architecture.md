# Архитектура BarBoss Inventory Management

## Обзор системы

BarBoss - это веб-приложение для управления инвентаризацией баров и ресторанов, построенное на Next.js 15 с использованием Firebase/Firestore в качестве backend.

## Технологический стек

- **Frontend Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS + Radix UI
- **Backend**: Firebase (Firestore, Authentication)
- **Type Safety**: TypeScript 5
- **Validation**: Zod
- **AI Integration**: Google Gemini (Genkit)
- **Testing**: Jest + React Testing Library

## Архитектурная диаграмма

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        UI[UI Components]
        Hooks[React Hooks]
        Context[React Contexts]
        Utils[Utility Functions]
    end
    
    subgraph NextJS["Next.js App Router"]
        Pages[Pages/Route Handlers]
        ServerActions[Server Actions]
        Middleware[Middleware]
    end
    
    subgraph Firebase["Firebase Services"]
        Auth[Firebase Auth]
        Firestore[Cloud Firestore]
        Storage[Cloud Storage]
    end
    
    subgraph AI["AI Services"]
        Gemini[Google Gemini API]
        Genkit[Genkit AI Flows]
    end
    
    UI --> Hooks
    Hooks --> Context
    Context --> Utils
    UI --> Pages
    Pages --> ServerActions
    Hooks --> Firestore
    Hooks --> Auth
    ServerActions --> Genkit
    Genkit --> Gemini
    Pages --> Firestore
    Pages --> Auth
    
    style Client fill:#e1f5ff
    style NextJS fill:#fff4e1
    style Firebase fill:#ffe1e1
    style AI fill:#e1ffe1
```

## Поток данных

### Аутентификация

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant FirebaseProvider
    participant FirebaseAuth
    participant Firestore
    
    User->>UI: Вход в систему
    UI->>FirebaseProvider: Запрос аутентификации
    FirebaseProvider->>FirebaseAuth: signInWithEmailAndPassword
    FirebaseAuth-->>FirebaseProvider: User object
    FirebaseProvider->>Firestore: Проверка роли пользователя
    Firestore-->>FirebaseProvider: UserProfile
    FirebaseProvider-->>UI: Обновление состояния
    UI-->>User: Отображение dashboard
```

### Создание инвентаризации

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant Firestore
    participant Calculations
    
    User->>Dashboard: Создать новую инвентаризацию
    Dashboard->>Firestore: Создать документ session
    Firestore-->>Dashboard: Session ID
    Dashboard->>Firestore: Загрузить продукты
    Firestore-->>Dashboard: Список продуктов
    User->>Dashboard: Ввод данных (startStock, purchases, sales, endStock)
    Dashboard->>Calculations: calculateLineFields
    Calculations-->>Dashboard: Теоретические значения и отклонения
    Dashboard->>Firestore: Сохранить inventory lines
    Firestore-->>Dashboard: Подтверждение сохранения
```

### AI-анализ отклонений

```mermaid
sequenceDiagram
    participant User
    participant Analytics
    participant ServerAction
    participant Genkit
    participant Gemini
    
    User->>Analytics: Запросить анализ отклонений
    Analytics->>ServerAction: analyzeInventoryVariance
    ServerAction->>ServerAction: Подготовка данных (сессии, линии, статистика)
    ServerAction->>Genkit: Запуск flow анализа
    Genkit->>Gemini: Запрос с промптом
    Gemini-->>Genkit: AI-анализ причин отклонений
    Genkit-->>ServerAction: Структурированный результат
    ServerAction-->>Analytics: Результаты анализа
    Analytics-->>User: Отображение рекомендаций
```

## Структура данных

### Firestore Collections

```
/users/{userId}
  - displayName
  - email
  - role
  - createdAt

/products/{productId}
  - name
  - category
  - costPerBottle
  - bottleVolumeMl
  - ...

/bars/{barId}
  - name
  - ownerUserId
  
  /inventorySessions/{sessionId}
    - name
    - status
    - createdAt
    - closedAt
    
    /lines/{lineId}
      - productId
      - startStock
      - purchases
      - sales
      - endStock
      - theoreticalEndStock
      - differenceVolume
      - differenceMoney
      
  /suppliers/{supplierId}
    - name
    - contactName
    - ...
    
  /purchaseOrders/{orderId}
    - supplierId
    - status
    - orderDate
    
    /lines/{lineId}
      - productId
      - quantity
      - costPerItem
```

## Безопасность

### Firestore Security Rules

- **Path-based ownership**: Каждый пользователь имеет доступ только к своему бару (`bar_{userId}`)
- **Role-based access**: Администраторы имеют расширенные права через коллекцию `roles_admin`
- **Data validation**: Валидация на уровне правил и через Zod схемы

### Аутентификация

- Firebase Authentication для управления пользователями
- JWT токены для сессий
- Защита от несанкционированного доступа через Security Rules

## Производительность

### Оптимизации

1. **Code Splitting**: Динамические импорты для тяжелых компонентов
2. **Caching**: localStorage для кэширования данных
3. **Memoization**: useMemo для дорогих вычислений
4. **Real-time Updates**: onSnapshot для live обновлений
5. **Batch Operations**: Использование writeBatch для множественных операций

### Индексы Firestore

- `inventorySessions`: status + closedAt (desc)
- `inventorySessions`: status + createdAt (desc)
- `purchaseOrders`: orderDate (desc)

## Обработка ошибок

### Стратегия

1. **Error Boundaries**: Перехват ошибок React компонентов
2. **Error Monitor**: Централизованный мониторинг ошибок (Sentry integration)
3. **Graceful Degradation**: Fallback для AI-анализа и других сервисов
4. **User Feedback**: Toast уведомления для пользователя

## Офлайн-режим

### Реализация

- **Offline Manager**: Очередь операций для синхронизации
- **Local Storage**: Кэширование данных для офлайн доступа
- **Sync on Reconnect**: Автоматическая синхронизация при восстановлении соединения

## Тестирование

### Покрытие

- **Unit Tests**: Бизнес-логика (calculations, utils)
- **Integration Tests**: Firestore операции
- **Component Tests**: UI компоненты (планируется расширение)

## Развертывание

### Environment Variables

- Firebase credentials (NEXT_PUBLIC_FIREBASE_*)
- Google GenAI API key (GOOGLE_GENAI_API_KEY)
- Sentry DSN (NEXT_PUBLIC_SENTRY_DSN, опционально)

### Build Process

1. TypeScript compilation
2. Next.js build с оптимизацией
3. Static generation где возможно
4. Deployment на платформу (Firebase Hosting / Vercel)

## Будущие улучшения

- [ ] PWA поддержка
- [ ] Расширенная аналитика
- [ ] Мобильное приложение
- [ ] Мультиязычность (i18n)
- [ ] Расширенное тестирование (E2E)

