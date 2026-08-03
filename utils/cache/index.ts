/**
 * Orbit
 *
 * Unified cache layer
 *
 * Uses Redis when available, otherwise falls back
 * to in-memory caching.
 *
 * @author BuddyWinte
 * @module utils/cache
 */

import redis from "./redis";
import { MemoryCache } from "./memory";

import type { CacheProvider } from "./memory";

const memory = new MemoryCache();

const provider: CacheProvider = redis ?? memory;

export const providerName = redis ? "redis" : "memory";

/**
 * Retrieves a value from cache.
 *
 * @param key - Cache key
 * @returns Cached value or null
 */
export async function get<T>(key: string): Promise<T | null> {
  return provider.get<T>(key);
}

/**
 * Stores a value in cache.
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Expiration time in seconds
 */
export async function set(
  key: string,
  value: unknown,
  ttl = 300,
): Promise<void> {
  return provider.set(key, value, ttl);
}

/**
 * Deletes a cache key.
 *
 * @param key - Cache key
 */
export async function del(key: string): Promise<void> {
  return provider.del(key);
}

/**
 * Checks whether a cache key exists.
 *
 * @param key - Cache key
 */
export async function has(key: string): Promise<boolean> {
  return provider.has(key);
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
  return provider.increment(key, ttl);
}

/**
 * Clears all cache data.
 */
export async function clear(): Promise<void> {
  return provider.clear();
}

const cache = {
  get,
  set,
  del,
  has,
  increment,
  clear
};

export default cache;
