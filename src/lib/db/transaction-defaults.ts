/**
 * Prisma transaction options for routes that perform many sequential writes.
 *
 * Interactive `prisma.$transaction(async (tx) => { ... })`: never parallelize
 * `tx.*` calls (no Promise.all on the same tx).
 *
 * Prefer this form over `$transaction([ prisma.foo.update(), ... ])` when you need
 * reliable `timeout` / `maxWait` typings (Prisma 6 batch-array overload is limited).
 */
export const BULK_INTERACTIVE_TRANSACTION = {
  maxWait: 10_000,
  timeout: 120_000,
} as const;
