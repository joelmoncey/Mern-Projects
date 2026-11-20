import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CACHE_KEYS,
  getCache,
  setCache,
  invalidateHashtagsCache,
  invalidateLeaderboardCache,
  flushAllCache,
} from './cache.js';

test('stores, retrieves, and invalidates hashtag and leaderboard caches by key/prefix', () => {
  flushAllCache();

  setCache(CACHE_KEYS.HASHTAGS_ACTIVE, { exams: ['UPSC'] }, 300);
  setCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`, [{ rank: 1 }], 60);
  setCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}creators`, [{ rank: 1 }], 60);

  assert.deepEqual(getCache(CACHE_KEYS.HASHTAGS_ACTIVE), { exams: ['UPSC'] });
  assert.deepEqual(getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`), [
    { rank: 1 },
  ]);

  invalidateHashtagsCache();
  assert.equal(getCache(CACHE_KEYS.HASHTAGS_ACTIVE), null);
  assert.notEqual(getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`), null);

  invalidateLeaderboardCache();
  assert.equal(getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`), null);
  assert.equal(getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}creators`), null);
});
