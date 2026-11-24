import rateLimit from 'express-rate-limit';
import { getRedisClient, REDIS_KEY_PREFIX } from '../config/redis.js';

const ATOMIC_INCR_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if current == 1 or ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

/**
 * Resilient hybrid store for express-rate-limit v7:
 * - Uses atomic Redis INCR + PEXPIRE across all PM2 cluster workers when
 *   Redis is connected.
 * - Falls back automatically to an in-memory window Map when REDIS_URL is
 *   not configured or if Redis restarts, ensuring requests never 500.
 */
export class HybridRateLimitStore {
  constructor(namespace) {
    this.namespace = namespace;
    this.prefix = `${REDIS_KEY_PREFIX}rl:${namespace}:`;
    this.localKeys = false;
    this.windowMs = 60_000;
    this.memoryHits = new Map();
    this.cleanupTimer = null;
  }

  init(options) {
    this.windowMs = options.windowMs;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryHits.entries()) {
        if (entry.resetMs <= now) {
          this.memoryHits.delete(key);
        }
      }
    }, Math.min(this.windowMs, 60_000));
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  redisKey(key) {
    return `${this.prefix}${key}`;
  }

  incrementInMemory(key) {
    const now = Date.now();
    const existing = this.memoryHits.get(key);
    if (!existing || existing.resetMs <= now) {
      const resetMs = now + this.windowMs;
      const next = { totalHits: 1, resetMs };
      this.memoryHits.set(key, next);
      return { totalHits: 1, resetTime: new Date(resetMs) };
    }
    existing.totalHits += 1;
    return {
      totalHits: existing.totalHits,
      resetTime: new Date(existing.resetMs),
    };
  }

  async increment(key) {
    const redis = getRedisClient();
    if (redis) {
      try {
        const result = await redis.eval(
          ATOMIC_INCR_SCRIPT,
          1,
          this.redisKey(key),
          String(this.windowMs)
        );
        const totalHits = Number(result?.[0]) || 1;
        const ttlMs = Math.max(Number(result?.[1]) || this.windowMs, 1);
        return {
          totalHits,
          resetTime: new Date(Date.now() + ttlMs),
        };
      } catch {
        // Fall through seamlessly to in-memory counter
      }
    }
    return this.incrementInMemory(key);
  }

  async decrement(key) {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.decr(this.redisKey(key));
        return;
      } catch {
        // Fall through to memory
      }
    }
    const existing = this.memoryHits.get(key);
    if (existing && existing.totalHits > 0) {
      existing.totalHits -= 1;
    }
  }

  async resetKey(key) {
    this.memoryHits.delete(key);
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(this.redisKey(key));
      } catch {
        // Ignore transient Redis error
      }
    }
  }

  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.memoryHits.clear();
  }
}

function makeLimiter({ namespace, windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    store: new HybridRateLimitStore(namespace),
    passOnStoreError: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    handler: (_req, res) => {
      res.status(429).json({
        error: message,
      });
    },
  });
}

// General /api fallback limiter (generous for mobile carrier CGNAT shared IPs)
export const apiLimiter = makeLimiter({
  namespace: 'api',
  windowMs: 15 * 60 * 1000,
  limit: 1200,
  message: 'Too many requests, please try again shortly.',
});

// Telegram authentication limiter
export const authLimiter = makeLimiter({
  namespace: 'auth',
  windowMs: 15 * 60 * 1000,
  limit: 200,
  message: 'Too many login attempts, please wait a few minutes.',
});

// Quiz creation / editing / deletion limiter
export const quizWriteLimiter = makeLimiter({
  namespace: 'quizwrite',
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: 'Quiz creation/edit rate limit reached. Please try again shortly.',
});

// High-frequency user actions (attempt, flag, like, follow)
export const actionLimiter = makeLimiter({
  namespace: 'action',
  windowMs: 5 * 60 * 1000,
  limit: 300,
  message: 'Action rate limit reached. Please slow down and try again shortly.',
});
