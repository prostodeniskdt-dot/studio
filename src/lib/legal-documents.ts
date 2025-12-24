/**
 * Константы юридических документов и контактной информации
 */

export const LEGAL_DOCUMENTS = {
  termsOfService: {
    url: 'https://docs.google.com/document/d/1THBxPQJjvhCdlvemgbhqsthiTfJ-ZGeinJZ7PfXyv38/edit?tab=t.0#heading=h.yv3pcu2f2kdr',
    version: '1.0',
    title: 'Пользовательское соглашение'
  },
  privacyPolicy: {
    url: 'https://docs.google.com/document/d/1x7psBmp0Xibwg5gRBgK54zheLvf8cunCrYTfidr8rFk/edit?tab=t.0',
    version: '1.0',
    title: 'Политика конфиденциальности и обработки персональных данных'
  },
  cookiePolicy: {
    url: 'https://docs.google.com/document/d/1vuUBemvaKaB4ZW_KdQBtQCfFuzgqurHp8bxd-VrkuEk/edit?tab=t.0',
    version: '1.0',
    title: 'Политика cookies'
  },
  dataProcessingConsent: {
    url: 'https://docs.google.com/document/d/1utIdEZhm7L6do7jiCMr7JX8Zd6vFP-qXzOyGe7kdK_A/edit?tab=t.0#heading=h.scateby2hcm4',
    version: '1.0',
    title: 'Согласие на обработку персональных данных'
  }
} as const;

export const SUPPORT_EMAIL = 'support@barboss.ru';

export const TELEGRAM_SUPPORT = {
  username: 'barboss_assistant',
  url: 'https://t.me/barboss_assistant'
} as const;

