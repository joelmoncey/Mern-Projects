import Redis from 'ioredis';

export const REDIS_KEY_PREFIX = (
  process.env.REDIS_KEY_PREFIX || 'quizgram:'
).trim();

let redisClient = null;
let injectedTestClient = null;
let lastErrorLogAt = 0;

export function getConfiguredRedisUrl() {
  if (String(process.env.REDIS_ENABLED || '').toLowerCase() === 'false') {
    return '';
  }
  return (process.env.REDIS_URL || '').trim();
}

/**
 * Allows unit tests to inject an in-memory mock Redis client without requiring
 * a live redis-server daemon on developer machines or CI.
 */
export function setRedisClientForTests(mockClient) {
  injectedTestClient = mockClient || null;
}

/**
 * Returns the active Redis client only when ready to serve commands immediately.
 */
export function getRedisClient() {
  if (injectedTestClient) {
    return injectedTestClient.status === 'ready' ? injectedTestClient : null;
  }
  if (redisClient && redisClient.status === 'ready') {
    return redisClient;
  }
  return null;
}

export function isRedisReady() {
  return Boolean(getRedisClient());
}

export function getRedisStatus() {
  if (injectedTestClient) {
    const ready = injectedTestClient.status === 'ready';
    return {
      configured: true,
      backend: ready ? 'redis' : 'node-cache',
      status: injectedTestClient.status || 'unknown',
    };
  }

  const url = getConfiguredRedisUrl();
  if (!url) {
    return {
      configured: false,
      backend: 'node-cache',
      status: 'disabled',
    };
  }

  const ready = Boolean(redisClient && redisClient.status === 'ready');
  return {
    configured: true,
    backend: ready ? 'redis' : 'node-cache',
    status: redisClient ? redisClient.status : 'disconnected',
  };
}

export async function connectRedis() {
  const url = getConfiguredRedisUrl();
  if (!url) {
    console.log(
      '[redis] REDIS_URL is not set — running with fast in-memory node-cache fallback.'
    );
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const client = new Redis(url, {
    lazyConnect: true,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    retryStrategy(times) {
      // Exponential backoff capped at 15s so background reconnects stay quiet
      return Math.min(times * 500, 15000);
    },
  });

  client.on('ready', () => {
    console.log('[redis] Connected and ready for shared caching & rate limiting');
  });

  client.on('error', (err) => {
    const now = Date.now();
    // Throttle connection error logs to at most once every 30s
    if (now - lastErrorLogAt > 30000) {
      lastErrorLogAt = now;
      console.warn(
        `[redis] Connection warning (${err.code || err.message}) — falling back to in-memory cache`
      );
    }
  });

  redisClient = client;

  try {
    await client.connect();
  } catch (err) {
    console.warn(
      `[redis] Initial connect failed (${err.message}). Server will continue using node-cache and auto-switch when Redis comes online.`
    );
  }

  return redisClient;
}

export async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    }
    redisClient = null;
  }
}
