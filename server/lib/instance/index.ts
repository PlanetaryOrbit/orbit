import { db } from '~~/server/database/client';
import cache from '~~/server/utils/cache';
import type { Instance } from '~~/shared/types';

type InstanceSettingsData = Omit<Instance, 'createdAt' | 'updatedAt'>;

const cacheKey = 'instance_settings';
const cacheTTL = 3600;

async function createSettings(data: Partial<InstanceSettingsData> = {}): Promise<Instance> {
  return db.orm.public.Instance.create(data as never);
}

export async function getSettings(): Promise<Instance> {
  const cached = await cache.get<Instance>(cacheKey);

  if (cached) {
    return cached;
  }

  const existing = await db.orm.public.Instance.first();
  const settings = existing ?? (await createSettings());

  await cache.set(cacheKey, settings, cacheTTL);

  return settings;
}

export async function updateSettings(data: Partial<InstanceSettingsData>): Promise<Instance> {
  const existing = await db.orm.public.Instance.first();

  if (!existing) {
    const settings = await createSettings(data);

    await cache.set(cacheKey, settings, cacheTTL);

    return settings;
  }

  const settings = await db.orm.public.Instance.where({}).update(data);

  if (!settings) {
    throw new Error('Failed to update instance settings');
  }

  await cache.set(cacheKey, settings, cacheTTL);

  return settings;
}

export async function invalidateSettings(): Promise<void> {
  await cache.del(cacheKey);
}
