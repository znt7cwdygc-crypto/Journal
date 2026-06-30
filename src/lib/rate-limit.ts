type Bucket = { count: number; firstAttempt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000; // 15 минут
const MAX_ATTEMPTS = 5;

// Раз в час подчищаем устаревшие записи, чтобы Map не росла бесконечно
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.firstAttempt > WINDOW_MS) buckets.delete(key);
  }
}, 60 * 60 * 1000).unref?.();

export function isRateLimited(key: string): boolean {
  const bucket = buckets.get(key);
  if (!bucket) return false;
  if (Date.now() - bucket.firstAttempt > WINDOW_MS) {
    buckets.delete(key);
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.firstAttempt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAttempt: now });
    return;
  }
  bucket.count += 1;
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}
