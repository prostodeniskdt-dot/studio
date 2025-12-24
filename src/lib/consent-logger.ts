import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { ConsentLog } from './types';

/**
 * Логирует согласие пользователя в Firestore для аудита
 */
export async function logConsent(
  firestore: Firestore,
  userId: string,
  consentType: 'terms_and_privacy' | 'cookies' | 'marketing',
  accepted: boolean,
  version: string,
  documentHash?: string
): Promise<void> {
  try {
    const ipAddress = await getClientIP();
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;

    await addDoc(collection(firestore, 'consent_logs'), {
      userId,
      consentType,
      accepted,
      version,
      timestamp: serverTimestamp(),
      ipAddress,
      userAgent,
      documentHash,
    } as Omit<ConsentLog, 'timestamp'> & { timestamp: ReturnType<typeof serverTimestamp> });
  } catch (error) {
    console.error('Failed to log consent:', error);
    // Не блокируем регистрацию при ошибке логирования
  }
}

/**
 * Получает IP адрес клиента (опционально)
 * В продакшене можно использовать Cloud Functions или внешний сервис
 */
async function getClientIP(): Promise<string | undefined> {
  // Можно использовать внешний сервис или получать через Cloud Functions
  // Для простоты возвращаем undefined, если нет доступа
  try {
    // Пример использования внешнего API (опционально)
    // const response = await fetch('https://api.ipify.org?format=json');
    // const data = await response.json();
    // return data.ip;
    return undefined;
  } catch {
    return undefined;
  }
}

