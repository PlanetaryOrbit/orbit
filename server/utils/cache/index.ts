import { MemoryCache } from './memory';
import type { CacheProvider } from './memory';
import redis from './redis-provider';

const memory = new MemoryCache();

function getProvider(): CacheProvider {
  if (redis?.isAvailable()) {
    return redis;
  }

  return memory;
}

export function getProviderName(): 'redis' | 'memory' {
  return redis?.isAvailable() ? 'redis' : 'memory';
}

/**
 * Retrieves a value from cache.
 *
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function get<T>(key: string): Promise<T | null> {
  return getProvider().get<T>(key);
}

/**
 * Stores a value in cache.
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Expiration time in seconds
 */
export async function set(key: string, value: unknown, ttl = 300): Promise<void> {
  return getProvider().set(key, value, ttl);
}

/**
 * Deletes a cache key.
 *
 * @param key - Cache key
 */
export async function del(key: string): Promise<void> {
  return getProvider().del(key);
}

/**
 * Checks whether a cache key exists.
 *
 * @param key - Cache key
 */
export async function has(key: string): Promise<boolean> {
  return getProvider().has(key);
}

/**
 * Increments a numeric cache key.
 *
 * Useful for rate limits and cooldowns.
 *
 * @param key - Cache key
 * @param ttl - Expiration time in seconds
 */
export async function increment(key: string, ttl = 60): Promise<number> {
  return getProvider().increment(key, ttl);
}

/**
 * Clears all cache data.
 */
export async function clear(): Promise<void> {
  return getProvider().clear();
}

const cache = {
  get,
  set,
  del,
  has,
  increment,
  clear,
};

export default cache;
