const FALLBACK_ADMIN_EMAILS = ['prostodeniskdt@gmail.com'];

function normalize(email: string) {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string) {
  const fromEnv =
    process.env.ADMIN_EMAILS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(normalize) ?? [];

  const allow = new Set([...FALLBACK_ADMIN_EMAILS.map(normalize), ...fromEnv]);
  return allow.has(normalize(email));
}

