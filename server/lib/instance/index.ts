import type { InstanceSettings } from '~~/server/generated/prisma/client';
import cache from '~~/server/utils/cache';
import { prisma } from '~~/server/utils/prisma';

const cacheTTL = 3600;
const cacheKey = 'instance_settings';

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
    createdAt: settings.createdAt.toISOString(),
  };
}

export async function getSettings(): Promise<InstanceSettings> {
  const cached = await cache.get<InstanceSettings>(cacheKey);

  if (cached) {
    return cached;
  }

  let settings = await prisma.instanceSettings.findFirst();

  if (!settings) {
    settings = await prisma.instanceSettings.create({
      data: {},
    });
  }

  await cache.set(cacheKey, settings, cacheTTL);

  return settings;
}

export async function updateSettings(
  data: Partial<Omit<InstanceSettings, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<InstanceSettings> {
  let settings = await prisma.instanceSettings.findFirst();

  if (!settings) {
    settings = await prisma.instanceSettings.create({
      data,
    });
  } else {
    settings = await prisma.instanceSettings.update({
      where: {
        id: settings.id,
      },
      data,
    });
  }

  await cache.del(cacheKey);
  await cache.set(cacheKey, settings, cacheTTL);

  return settings;
}

export async function invalidateSettings(): Promise<void> {
  await cache.del(cacheKey);
}
