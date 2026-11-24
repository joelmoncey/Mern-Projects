import NodeCache from 'node-cache';
import { getRedisClient, REDIS_KEY_PREFIX } from '../config/redis.js';

/**
 * Hybrid cache layer:
 * - Primary (when REDIS_URL is connected): Local/shared Redis (`127.0.0.1:6379`)
 *   so cache survives PM2 restarts and stays synchronized across multi-core
 *   PM2 cluster workers (`pm2 start index.js -i max`).
 * - Automatic Fallback (when REDIS_URL is unset or Redis is unreachable):
 *   In-process `node-cache` with zero errors or downtime.
 */
const memoryStore = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: true,
});

export const CACHE_KEYS = {
  HASHTAGS_ACTIVE: 'hashtags:active',
  HASHTAGS_ALL: 'hashtags:all',
  LEADERBOARD_PREFIX: 'leaderboard:',
  MOCK_TESTS_PREFIX: 'mocktests:',
};

function toRedisCacheKey(key) {
  return `${REDIS_KEY_PREFIX}cache:${key}`;
}

export async function getCache(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const raw = await redis.get(toRedisCacheKey(key));
      if (raw === null || raw === undefined) {
        return null;
      }
      return JSON.parse(raw);
    } catch {
      // Fall through seamlessly to in-memory backup if Redis hiccups
    }
  }
  return memoryStore.get(key) ?? null;
}

export async function setCache(key, value, ttlSeconds = 60) {
  const safeTtl = Math.max(1, Math.floor(Number(ttlSeconds) || 60));

  // Keep warm backup in local memory in case Redis restarts mid-flight
  memoryStore.set(key, value, safeTtl);

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(
        toRedisCacheKey(key),
        JSON.stringify(value),
        'EX',
        safeTtl
      );
    } catch {
      // Safe fallback: memoryStore already holds the value
    }
  }

  return value;
}

export async function delCache(keyOrKeys) {
  const keys = (Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]).filter(
    Boolean
  );
  if (keys.length === 0) return;

  memoryStore.del(keys);

  const redis = getRedisClient();
  if (redis) {
    try {
      const redisKeys = keys.map(toRedisCacheKey);
      if (typeof redis.unlink === 'function') {
        await redis.unlink(...redisKeys);
      } else {
        await redis.del(...redisKeys);
      }
    } catch {
      // Ignore transient Redis error on invalidation
    }
  }
}

export async function delCacheByPrefix(prefix) {
  const memKeys = memoryStore.keys().filter((k) => k.startsWith(prefix));
  if (memKeys.length > 0) {
    memoryStore.del(memKeys);
  }

  const redis = getRedisClient();
  if (!redis) return;

  try {
    const matchPattern = `${toRedisCacheKey(prefix)}*`;
    let cursor = '0';
    do {
      const [nextCursor, foundKeys] = await redis.scan(
        cursor,
        'MATCH',
        matchPattern,
        'COUNT',
        100
      );
      cursor = String(nextCursor);
      if (Array.isArray(foundKeys) && foundKeys.length > 0) {
        if (typeof redis.unlink === 'function') {
          await redis.unlink(...foundKeys);
        } else {
          await redis.del(...foundKeys);
        }
      }
    } while (cursor !== '0');
  } catch {
    // Ignore transient Redis error on prefix scan
  }
}

export async function flushAllCache() {
  memoryStore.flushAll();
  await delCacheByPrefix('');
}

export function invalidateHashtagsCache() {
  return delCache([CACHE_KEYS.HASHTAGS_ACTIVE, CACHE_KEYS.HASHTAGS_ALL]).catch(
    () => {}
  );
}

export function invalidateLeaderboardCache() {
  return delCacheByPrefix(CACHE_KEYS.LEADERBOARD_PREFIX).catch(() => {});
}

export function invalidateMockTestsCache() {
  return delCacheByPrefix(CACHE_KEYS.MOCK_TESTS_PREFIX).catch(() => {});
}
