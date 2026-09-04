import Redis from 'ioredis';

const globalForRedis = globalThis as typeof globalThis & {
  __orbit_redis?: Redis | null;
};

function createRedisClient(): Redis | null {
  const config = useRuntimeConfig();
  const url = String(config.redisUrl || '');

  if (!url) {
    return null;
  }

  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });

  client.on('error', (error) => {
    console.warn('[Redis] Unavailable:', error.message);
  });

  return client;
}

export const redis = globalForRedis.__orbit_redis ?? createRedisClient();

if (import.meta.dev) {
  globalForRedis.__orbit_redis = redis;
}

export async function connectRedis(): Promise<boolean> {
  if (!redis) {
    return false;
  }

  if (redis.status === 'ready') {
    return true;
  }

  try {
    await redis.connect();
    await redis.ping();

    console.log('[Redis] Connected');

    return true;
  } catch (error) {
    console.warn(
      '[Redis] Unavailable, continuing without Redis:',
      error instanceof Error ? error.message : error,
    );

    redis.disconnect();

    return false;
  }
}

export function isRedisAvailable(): boolean {
  return redis?.status === 'ready';
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) {
    return;
  }

  if (redis.status === 'ready' || redis.status === 'connecting') {
    await redis.quit();
  }
}
