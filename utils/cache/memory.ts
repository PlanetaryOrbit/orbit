export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  increment(key: string, ttl?: number): Promise<number>;
  setStrict(key: string, value: unknown, ttl?: number): Promise<void>;
  delStrict(key: string): Promise<void>;
  hasStrict(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

interface CacheEntry {
  value: unknown;
  expires: number;
}

export class MemoryCache implements CacheProvider {
  private cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<T | null> {
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

  async set(key: string, value: unknown, ttl = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async increment(key: string, ttl = 60): Promise<number> {
    const now = Date.now();
    const item = this.cache.get(key);

    if (!item || now >= item.expires) {
      this.cache.set(key, { value: 1, expires: now + ttl * 1000 });
      return 1;
    }

    const value = (typeof item.value === 'number' ? item.value : 0) + 1;
    item.value = value;

    return value;
  }

  async setStrict(key: string, value: unknown, ttl = 300): Promise<void> {
    await this.set(key, value, ttl);
  }

  async delStrict(key: string): Promise<void> {
    await this.del(key);
  }

  async hasStrict(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
