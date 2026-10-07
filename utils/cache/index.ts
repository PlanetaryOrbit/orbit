import { MemoryCache } from './memory';
import type { CacheProvider } from './memory';
import redis from './redis';

const memory = new MemoryCache();

const provider: CacheProvider = redis ?? memory;

export const providerName = redis ? 'redis' : 'memory';

interface SWREntry<T> {
  value: T;
  createdAt: number;
  staleAt: number;
  expiresAt: number;
}

export interface SWROptions {
  freshFor: number;
  staleFor: number;
}

const revalidating = new Map<string, Promise<void>>();

export async function get<T>(key: string): Promise<T | null> {
  try {
    return await provider.get<T>(key);
  } catch {
    return null;
  }
}

export async function set(key: string, value: unknown, ttl = 300): Promise<void> {
  try {
    await provider.set(key, value, ttl);
  } catch {
    // cache failures should not break requests
  }
}

export async function del(key: string): Promise<void> {
  try {
    await provider.del(key);
  } catch {
    // cache failures should not break requests
  }
}

export async function has(key: string): Promise<boolean> {
  try {
    return await provider.has(key);
  } catch {
    return false;
  }
}

export async function increment(key: string, ttl = 60): Promise<number> {
  try {
    return await provider.increment(key, ttl);
  } catch {
    return 0;
  }
}

export async function clear(): Promise<void> {
  try {
    await provider.clear();
  } catch {
    // cache failures should not break startup/requests
  }
}

// SWR / Stale-while-revalidate cache
export async function swr<T>(
  key: string,
  loader: () => Promise<T>,
  options: SWROptions,
): Promise<T> {
  const now = Date.now();

  const cached = await get<SWREntry<T>>(key);

  if (cached) {
    if (now < cached.staleAt) {
      return cached.value;
    }

    if (now < cached.expiresAt) {
      void revalidate(key, loader, options);

      return cached.value;
    }
  }

  return revalidateAndWait(key, loader, options);
}

async function revalidate<T>(
  key: string,
  loader: () => Promise<T>,
  options: SWROptions,
): Promise<void> {
  if (revalidating.has(key)) {
    return revalidating.get(key);
  }

  const promise = (async () => {
    try {
      const value = await loader();

      const now = Date.now();

      const entry: SWREntry<T> = {
        value,
        createdAt: now,
        staleAt: now + options.freshFor * 1000,
        expiresAt: now + options.staleFor * 1000,
      };

      await set(key, entry, options.staleFor);
    } catch (error) {
      console.error('[Cache] Revalidation failed for key %s:', key, error);
    } finally {
      revalidating.delete(key);
    }
  })();

  revalidating.set(key, promise);

  return promise;
}

async function revalidateAndWait<T>(
  key: string,
  loader: () => Promise<T>,
  options: SWROptions,
): Promise<T> {
  const existing = revalidating.get(key);

  if (existing) {
    await existing;

    const cached = await get<SWREntry<T>>(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  let value: T;

  try {
    value = await loader();
  } catch (error) {
    console.error('[Cache] Initial load failed for key %s:', key, error);
    throw error;
  }

  const now = Date.now();

  const entry: SWREntry<T> = {
    value,
    createdAt: now,
    staleAt: now + options.freshFor * 1000,
    expiresAt: now + options.staleFor * 1000,
  };

  await set(key, entry, options.staleFor);

  return value;
}

const cache = {
  get,
  set,
  del,
  has,
  increment,
  clear,
  swr,
};

export default cache;
