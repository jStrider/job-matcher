/**
 * Simple in-memory rate limiter.
 * Tracks request counts per key (IP or userId) within a sliding window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60s to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000).unref?.();

interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowSeconds * 1000 };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/** Pre-configured limiters for different routes */
export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowSeconds: 60 },        // 5 login/register per minute
  search: { maxRequests: 10, windowSeconds: 60 },      // 10 searches per minute
  linkedin: { maxRequests: 5, windowSeconds: 60 },     // 5 LinkedIn imports per minute
  pdfParse: { maxRequests: 10, windowSeconds: 60 },    // 10 PDF parses per minute
  api: { maxRequests: 30, windowSeconds: 60 },          // 30 general API calls per minute
} as const;
