type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimitOrThrow(options: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const existing = buckets.get(options.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, { count: 1, resetAt: now + options.windowMs });
    return;
  }
  existing.count += 1;
  if (existing.count > options.limit) {
    const seconds = Math.ceil((existing.resetAt - now) / 1000);
    const error = new Error(`Rate limit exceeded. Retry in ${seconds}s.`);
    // @ts-expect-error attach status
    error.status = 429;
    throw error;
  }
}
