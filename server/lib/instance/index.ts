import type { FieldOutputTypes } from '@@/prisma/contract.d';
import { db } from '~~/server/database/client';
import cache from '~~/server/utils/cache';

export type InstanceSettings = FieldOutputTypes['public']['Instance'];

type InstanceSettingsData = Omit<InstanceSettings, 'id' | 'createdAt' | 'updatedAt'>;

export const DEFAULTS: InstanceSettingsData = {
  name: 'Orbit',
  logoUrl: '/favicon.png',
  allowPasswordAuth: true,
  allowRobloxAuth: false,
  enableRegistration: true,
  primaryColor: '#fb019c',
  darkBackground: '/orbitbackground-dark.svg',
  lightBackground: '/orbitbackground-light.svg',
  isSetup: false,
};

const cacheKey = 'instance_settings';
const cacheTTL = 3600;

async function createSettings(data: Partial<InstanceSettingsData> = {}): Promise<InstanceSettings> {
  return db.orm.public.Instance.create({
    ...DEFAULTS,
    ...data,
  });
}

export async function getSettings(): Promise<InstanceSettings> {
  const cached = await cache.get<InstanceSettings>(cacheKey);

  if (cached) {
    return cached;
  }

  const existing = await db.orm.public.Instance.first();

  const settings = existing ?? (await createSettings());

  await cache.set(cacheKey, settings, cacheTTL);

  return settings;
}

export async function updateSettings(
  data: Partial<InstanceSettingsData>,
): Promise<InstanceSettings> {
  const existing = await db.orm.public.Instance.first();

  if (!existing) {
    const settings = await createSettings(data);

    await cache.set(cacheKey, settings, cacheTTL);

    return settings;
  }

  const settings = await db.orm.public.Instance.where({ id: existing.id }).update(data);

  if (!settings) {
    throw new Error('Failed to update instance settings');
  }

  await cache.set(cacheKey, settings, cacheTTL);

  return settings;
}

export async function invalidateSettings(): Promise<void> {
  await cache.del(cacheKey);
}
