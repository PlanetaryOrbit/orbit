import Redis from 'ioredis';

import type { CacheProvider } from './memory';

let client: Redis | null = null;

if (process.env.REDIS_URL) {
  let redis: Redis | null = null;

  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

    redis.on('error', (err) => {
      console.warn('[Cache] Redis unavailable:', err.message);
    });

    await redis.connect();
    await redis.ping();

    client = redis;

    console.log('[Cache] Redis connected');
  } catch {
    redis?.disconnect();

    console.warn('[Cache] Redis unavailable, using memory cache');

    client = null;
  }
}

const redisCache: CacheProvider | null = client
  ? {
      async get<T>(key: string): Promise<T | null> {
        try {
          const value = await client!.get(key);

          if (value === null) {
            return null;
          }

          return JSON.parse(value) as T;
        } catch (error) {
          console.warn('[Cache] Redis get failed:', error);
          return null;
        }
      },

      async set(key: string, value: unknown, ttl = 300): Promise<void> {
        try {
          await client!.set(key, JSON.stringify(value), 'EX', ttl);
        } catch (error) {
          console.warn('[Cache] Redis set failed:', error);
        }
      },

      async del(key: string): Promise<void> {
        try {
          await client!.del(key);
        } catch (error) {
          console.warn('[Cache] Redis delete failed:', error);
        }
      },

      async has(key: string): Promise<boolean> {
        try {
          return (await client!.exists(key)) === 1;
        } catch (error) {
          console.warn('[Cache] Redis exists failed:', error);
          return false;
        }
      },

      async increment(key: string, ttl = 60): Promise<number> {
        try {
          const value = await client!.incr(key);

          if (value === 1) {
            await client!.expire(key, ttl);
          }

          return value;
        } catch (error) {
          console.warn('[Cache] Redis increment failed:', error);
          return 0;
        }
      },

      async clear(): Promise<void> {
        try {
          await client!.flushdb();
        } catch (error) {
          console.warn('[Cache] Redis clear failed:', error);
        }
      },
    }
  : null;

export default redisCache;
