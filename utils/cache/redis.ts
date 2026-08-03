/**
 * Orbit
 *
 * Redis cache provider
 *
 * @author BuddyWinte
 * @module utils/v2/cache/redis
 */

import Redis from "ioredis";

import type { CacheProvider } from "./memory";

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

    redis.on("error", (err) => {
      console.warn("[Cache] Redis unavailable:", err.message);
    });

    await redis.connect();
    await redis.ping();

    client = redis;

    console.log("[Cache] Redis connected");
  } catch {
    redis?.disconnect();

    console.warn(
      "[Cache] Redis unavailable, using memory cache"
    );

    client = null;
  }
}

const redisCache: CacheProvider | null = client
  ? {
      async get<T>(key: string): Promise<T | null> {
        const value = await client!.get(key);

        if (value === null) {
          return null;
        }

        return JSON.parse(value) as T;
      },

      async set(
        key: string,
        value: unknown,
        ttl = 300
      ): Promise<void> {
        await client!.set(
          key,
          JSON.stringify(value),
          "EX",
          ttl
        );
      },

      async del(key: string): Promise<void> {
        await client!.del(key);
      },

      async has(key: string): Promise<boolean> {
        return (await client!.exists(key)) === 1;
      },

      async increment(
        key: string,
        ttl = 60
      ): Promise<number> {
        const value = await client!.incr(key);

        if (value === 1) {
          await client!.expire(key, ttl);
        }

        return value;
      },

      async clear(): Promise<void> {
        await client!.flushdb();
      },
    }
  : null;

export default redisCache;
