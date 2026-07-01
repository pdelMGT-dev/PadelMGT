// rate-limit.ts — Shared rate limiter with an Upstash Redis backend.
//
// On Vercel each serverless instance has its own memory, so an in-memory
// counter is trivially bypassed (requests land on different instances) and
// resets on cold starts. When UPSTASH_REDIS_REST_URL + _TOKEN are configured
// we use a Redis-backed sliding window shared across all instances.
//
// If Upstash isn't configured (local dev, or a deploy without the env vars) we
// fall back to a per-instance in-memory limiter so nothing breaks — it's just
// weaker, exactly the previous behaviour.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitRule {
  /** Unique prefix so different endpoints don't share a bucket. */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

// ── Upstash backend (lazy singletons) ────────────────────────────────────────

let _redis: Redis | null | undefined;
function redis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  _redis = url && token ? new Redis({ url, token }) : null;
  return _redis;
}

const _limiters = new Map<string, Ratelimit>();
function upstashLimiter(rule: RateLimitRule): Ratelimit | null {
  const r = redis();
  if (!r) return null;
  const cacheKey = `${rule.name}:${rule.limit}:${rule.windowSeconds}`;
  let limiter = _limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSeconds} s`),
      prefix: `rl:${rule.name}`,
      analytics: false,
    });
    _limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// ── In-memory fallback ───────────────────────────────────────────────────────

const _memory = new Map<string, { count: number; resetAt: number }>();
function memoryAllow(rule: RateLimitRule, key: string): boolean {
  const now = Date.now();
  const bucketKey = `${rule.name}:${key}`;
  const entry = _memory.get(bucketKey);
  if (!entry || entry.resetAt < now) {
    _memory.set(bucketKey, { count: 1, resetAt: now + rule.windowSeconds * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= rule.limit;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if the request identified by `key` (usually the client IP) is
 * within the rule's limit, false if it should be rejected (HTTP 429).
 * Uses Upstash when configured, otherwise the in-memory fallback.
 */
export async function rateLimitAllow(rule: RateLimitRule, key: string): Promise<boolean> {
  const limiter = upstashLimiter(rule);
  if (limiter) {
    try {
      const { success } = await limiter.limit(key);
      return success;
    } catch {
      // Redis unreachable — fail open to the in-memory limiter rather than
      // locking every caller out.
      return memoryAllow(rule, key);
    }
  }
  return memoryAllow(rule, key);
}

/** Extract the best-effort client IP from the request headers. */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

// ── Named rules ──────────────────────────────────────────────────────────────

export const SA_LOGIN_RULE: RateLimitRule = { name: 'sa-login', limit: 10, windowSeconds: 600 };
export const EMAIL_SEND_RULE: RateLimitRule = { name: 'email-send', limit: 20, windowSeconds: 600 };
