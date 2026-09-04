import { redis } from '~~/server/utils/redis';

import type { CacheProvider } from './memory';

export type RedisCacheProvider = CacheProvider & {
  isAvailable(): boolean;
};

const redisClient = redis;

const redisCache: RedisCacheProvider | null = redisClient
  ? {
      isAvailable(): boolean {
        return redisClient.status === 'ready';
      },

      async get<T>(key: string): Promise<T | null> {
        const value = await redisClient.get(key);

        if (value === null) {
          return null;
        }

        return JSON.parse(value) as T;
      },

      async set(key: string, value: unknown, ttl = 300): Promise<void> {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttl);
      },

      async del(key: string): Promise<void> {
        await redisClient.del(key);
      },

      async has(key: string): Promise<boolean> {
        return (await redisClient.exists(key)) === 1;
      },

      async increment(key: string, ttl = 60): Promise<number> {
        const value = await redisClient.incr(key);

        if (value === 1) {
          await redisClient.expire(key, ttl);
        }

        return value;
      },

      async clear(): Promise<void> {
        await redisClient.flushdb();
      },
    }
  : null;

export default redisCache;
