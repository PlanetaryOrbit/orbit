/**
 * Orbit
 *
 * In-memory cache provider
 *
 * @author BuddyWinte
 * @module utils/v2/cache/memory
 */

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  increment(key: string, ttl?: number): Promise<number>;
  clear(): Promise<void>;
}

export class MemoryCache implements CacheProvider {
  private cache = new Map<
    string,
    {
      value: unknown;
      expires: number;
    }
  >();

  async get<T>(
    key: string
  ): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() >= item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set(
    key: string,
    value: unknown,
    ttl = 300
  ): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  async del(
    key: string
  ): Promise<void> {
    this.cache.delete(key);
  }

  async has(
    key: string
  ): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async increment(
    key: string,
    ttl = 60
  ): Promise<number> {
    const current = await this.get<number>(key);

    const value = (current ?? 0) + 1;

    await this.set(
      key,
      value,
      ttl
    );

    return value;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
