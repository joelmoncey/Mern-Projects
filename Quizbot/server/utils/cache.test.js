import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CACHE_KEYS,
  getCache,
  setCache,
  invalidateHashtagsCache,
  invalidateLeaderboardCache,
  invalidateMockTestsCache,
  flushAllCache,
} from './cache.js';
import {
  setRedisClientForTests,
  getRedisStatus,
} from '../config/redis.js';
import { HybridRateLimitStore } from '../middleware/rateLimiter.js';

function createMockRedisClient() {
  const kv = new Map();
  const ttls = new Map();

  return {
    status: 'ready',
    kv,
    async get(key) {
      return kv.has(key) ? kv.get(key) : null;
    },
    async set(key, val, mode, ttl) {
      kv.set(key, val);
      if (mode === 'EX') {
        ttls.set(key, Number(ttl));
      }
      return 'OK';
    },
    async unlink(...keys) {
      let removed = 0;
      for (const k of keys) {
        if (kv.delete(k)) removed += 1;
        ttls.delete(k);
      }
      return removed;
    },
    async del(...keys) {
      return this.unlink(...keys);
    },
    async scan(_cursor, _matchCmd, pattern) {
      const prefix = pattern.replace(/\*$/, '');
      const found = Array.from(kv.keys()).filter((k) => k.startsWith(prefix));
      return ['0', found];
    },
    async eval(_script, _numKeys, key, windowMsStr) {
      const next = (Number(kv.get(key)) || 0) + 1;
      kv.set(key, String(next));
      if (!ttls.has(key)) {
        ttls.set(key, Number(windowMsStr));
      }
      return [next, ttls.get(key)];
    },
    async decr(key) {
      const next = Math.max(0, (Number(kv.get(key)) || 0) - 1);
      kv.set(key, String(next));
      return next;
    },
  };
}

test('fallback mode (no Redis): stores, retrieves, and invalidates caches in node-cache', async () => {
  setRedisClientForTests(null);
  await flushAllCache();

  await setCache(CACHE_KEYS.HASHTAGS_ACTIVE, { exams: ['UPSC'] }, 300);
  await setCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`, [{ rank: 1 }], 60);
  await setCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}creators`, [{ rank: 1 }], 60);
  await setCache(`${CACHE_KEYS.MOCK_TESTS_PREFIX}ssc`, [{ title: 'Mock 1' }], 60);

  assert.deepEqual(await getCache(CACHE_KEYS.HASHTAGS_ACTIVE), {
    exams: ['UPSC'],
  });
  assert.deepEqual(
    await getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`),
    [{ rank: 1 }]
  );
  assert.deepEqual(await getCache(`${CACHE_KEYS.MOCK_TESTS_PREFIX}ssc`), [
    { title: 'Mock 1' },
  ]);

  await invalidateHashtagsCache();
  assert.equal(await getCache(CACHE_KEYS.HASHTAGS_ACTIVE), null);
  assert.notEqual(
    await getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`),
    null
  );

  await invalidateLeaderboardCache();
  assert.equal(
    await getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`),
    null
  );
  assert.equal(
    await getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}creators`),
    null
  );

  await invalidateMockTestsCache();
  assert.equal(await getCache(`${CACHE_KEYS.MOCK_TESTS_PREFIX}ssc`), null);
});

test('Redis mode: reads/writes JSON to Redis, scans prefixes, and fails over cleanly if Redis drops', async () => {
  const mockRedis = createMockRedisClient();
  setRedisClientForTests(mockRedis);

  try {
    assert.deepEqual(getRedisStatus(), {
      configured: true,
      backend: 'redis',
      status: 'ready',
    });

    await setCache(CACHE_KEYS.HASHTAGS_ACTIVE, { exams: ['SSC', 'RRB'] }, 300);
    await setCache(
      `${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`,
      [{ rank: 1, firstName: 'Joel' }],
      60
    );

    // Confirm keys actually landed in Redis with namespace prefix
    assert.ok(mockRedis.kv.has('quizgram:cache:hashtags:active'));
    assert.deepEqual(await getCache(CACHE_KEYS.HASHTAGS_ACTIVE), {
      exams: ['SSC', 'RRB'],
    });

    // Simulate Redis error mid-flight -> seamlessly serves hot backup from node-cache
    const origGet = mockRedis.get;
    mockRedis.get = async () => {
      throw new Error('ECONNRESET');
    };
    assert.deepEqual(await getCache(CACHE_KEYS.HASHTAGS_ACTIVE), {
      exams: ['SSC', 'RRB'],
    });
    mockRedis.get = origGet;

    // Prefix SCAN invalidation removes leaderboard keys from Redis
    await invalidateLeaderboardCache();
    assert.equal(
      mockRedis.kv.has('quizgram:cache:leaderboard:solvers'),
      false
    );
    assert.equal(
      await getCache(`${CACHE_KEYS.LEADERBOARD_PREFIX}solvers`),
      null
    );
  } finally {
    setRedisClientForTests(null);
    await flushAllCache();
  }
});

test('HybridRateLimitStore increments atomically in Redis and falls back to memory when offline', async () => {
  const store = new HybridRateLimitStore('test');
  store.init({ windowMs: 60_000 });

  const mockRedis = createMockRedisClient();
  setRedisClientForTests(mockRedis);

  try {
    const r1 = await store.increment('1.2.3.4');
    const r2 = await store.increment('1.2.3.4');
    assert.equal(r1.totalHits, 1);
    assert.equal(r2.totalHits, 2);
    assert.ok(r2.resetTime instanceof Date);

    await store.resetKey('1.2.3.4');
    const rAfterReset = await store.increment('1.2.3.4');
    assert.equal(rAfterReset.totalHits, 1);

    // Disconnect Redis -> automatic fallback to memory without throwing
    mockRedis.status = 'reconnecting';
    const m1 = await store.increment('5.6.7.8');
    const m2 = await store.increment('5.6.7.8');
    assert.equal(m1.totalHits, 1);
    assert.equal(m2.totalHits, 2);
  } finally {
    store.shutdown();
    setRedisClientForTests(null);
  }
});
