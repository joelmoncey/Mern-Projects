import NodeCache from 'node-cache';

/**
 * Clean in-memory cache service backed by node-cache, structured with a
 * key/prefix adapter interface so it can be swapped to Redis later without
 * changing controller call sites.
 */
const store = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: true,
});

export const CACHE_KEYS = {
  HASHTAGS_ACTIVE: 'hashtags:active',
  HASHTAGS_ALL: 'hashtags:all',
  LEADERBOARD_PREFIX: 'leaderboard:',
};

export function getCache(key) {
  return store.get(key) ?? null;
}

export function setCache(key, value, ttlSeconds = 60) {
  store.set(key, value, ttlSeconds);
  return value;
}

export function delCache(key) {
  store.del(key);
}

export function delCacheByPrefix(prefix) {
  const keys = store.keys().filter((k) => k.startsWith(prefix));
  if (keys.length > 0) {
    store.del(keys);
  }
}

export function flushAllCache() {
  store.flushAll();
}

export function invalidateHashtagsCache() {
  store.del([CACHE_KEYS.HASHTAGS_ACTIVE, CACHE_KEYS.HASHTAGS_ALL]);
}

export function invalidateLeaderboardCache() {
  delCacheByPrefix(CACHE_KEYS.LEADERBOARD_PREFIX);
}
