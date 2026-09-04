import type { FieldOutputTypes } from '@@/prisma/contract.d';
import { db } from '~~/server/database/client';
import cache from '~~/server/utils/cache';

const cacheTTL = 3600;
const cacheKey = 'instance_settings';

type InstanceSettings = FieldOutputTypes['public']['InstanceSettings'];

export type ClientInstanceSettings = Omit<InstanceSettings, 'id' | 'updatedAt' | 'createdAt'> & {
  createdAt: string;
};

export const DEFAULTS: ClientInstanceSettings = {
  name: 'Orbit',
  logoUrl: '/favicon.png',
  allowPasswordAuth: true,
  allowRobloxAuth: false,
  enableRegistration: true,
  primaryColor: '#fb019c',
  darkBackground: '/orbitbackground-dark.svg',
  lightBackground: '/orbitbackground-light.svg',
  isSetup: false,
  createdAt: new Date(0).toISOString(),
};

export function serializeSettings(settings: InstanceSettings): ClientInstanceSettings {
  const { id, updatedAt, ...rest } = settings;

  return {
    ...rest,
    createdAt: settings.createdAt.toString(),
  };
}

export async function getSettings(): Promise<InstanceSettings> {
  const cached = await cache.get<InstanceSettings>(cacheKey);

  if (cached) {
    return cached;
  }

  let settings = await db.orm.public.InstanceSettings.first();

  if (!settings) {
    settings = await db.orm.public.InstanceSettings.create({
      name: DEFAULTS.name,
      logoUrl: DEFAULTS.logoUrl,
      allowPasswordAuth: DEFAULTS.allowPasswordAuth,
      allowRobloxAuth: DEFAULTS.allowRobloxAuth,
      enableRegistration: DEFAULTS.enableRegistration,
      primaryColor: DEFAULTS.primaryColor,
      darkBackground: DEFAULTS.darkBackground,
      lightBackground: DEFAULTS.lightBackground,
      isSetup: DEFAULTS.isSetup,
    });
  }

  await cache.set(cacheKey, settings, cacheTTL);

  return settings;
}

export async function updateSettings(
  data: Partial<Omit<InstanceSettings, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<InstanceSettings> {
  let settings = await db.orm.public.InstanceSettings.first();

  if (!settings) {
    settings = await db.orm.public.InstanceSettings.create({
      name: DEFAULTS.name,
      logoUrl: DEFAULTS.logoUrl,
      allowPasswordAuth: DEFAULTS.allowPasswordAuth,
      allowRobloxAuth: DEFAULTS.allowRobloxAuth,
      enableRegistration: DEFAULTS.enableRegistration,
      primaryColor: DEFAULTS.primaryColor,
      darkBackground: DEFAULTS.darkBackground,
      lightBackground: DEFAULTS.lightBackground,
      isSetup: DEFAULTS.isSetup,
      ...data,
    });
  } else {
    const updated = await db.orm.public.InstanceSettings.where({ id: settings.id }).update(data);

    if (!updated) {
      throw new Error('Failed to update instance settings');
    }

    settings = updated;
  }

  await cache.del(cacheKey);
  await cache.set(cacheKey, settings, cacheTTL);

  return settings;
}

export async function invalidateSettings(): Promise<void> {
  await cache.del(cacheKey);
}
