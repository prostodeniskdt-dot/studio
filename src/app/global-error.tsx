'use client';

/**
 * Root-level error UI. If the root layout or a critical subtree throws,
 * Next.js renders this instead of a blank page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.25rem' }}>Ошибка приложения</h1>
        <p style={{ color: '#555' }}>
          Что-то пошло не так при загрузке. Попробуйте обновить страницу или открыть сайт в режиме инкогнито.
        </p>
        {process.env.NODE_ENV !== 'production' && (
          <pre style={{ fontSize: 12, overflow: 'auto', background: '#f5f5f5', padding: 12 }}>
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={() => reset()}
          style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
        >
          Попробовать снова
        </button>
      </body>
    </html>
  );
}
