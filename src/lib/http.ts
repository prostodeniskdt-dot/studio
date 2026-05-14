export function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

/** Статус ответа API по тексту ошибки из try/catch. */
export function statusFromApiError(message: string): number {
  if (message === 'Forbidden') return 403;
  if (message === 'Not authenticated' || message === 'Session expired') return 401;
  return 400;
}

export async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text) throw new Error('Missing JSON body');
  return JSON.parse(text) as T;
}

