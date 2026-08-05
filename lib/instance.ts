/**
 * Orbit
 *
 * Instance settings manager.
 *
 * Handles loading and caching instance-wide configuration.
 *
 * @author BuddyWinte
 */
 import { prisma } from "@/lib/prisma";
import cache from "@/utils/cache";

export type InstanceSettings = {
  id: string;
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  allowPasswordAuth: boolean;
  allowRobloxAuth: boolean;
  enableRegistration: boolean;
  primaryColor: string;
  darkBackground: string;
  lightBackground: string | null;
  isSetup: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function getSettings(): Promise<InstanceSettings> {
  const cached = await cache.get<InstanceSettings>("instance_settings");

  if (cached) {
    return cached;
  }

  let settings = await prisma.instanceSettings.findFirst();

  if (!settings) {
    settings = await prisma.instanceSettings.create({
      data: {},
    });
  }

  await cache.set(
    "instance_settings",
    settings,
    60 * 60,
  );

  return settings;
}

export async function updateSettings(
  data: Partial<Omit<InstanceSettings, "id" | "createdAt" | "updatedAt">>,
) {
  cache.del("isSetup");
  cache.set("isSetup", true);
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

  await cache.del("instance_settings");
  await cache.set("instance_settings", settings, 60 * 60);

  return settings;
}


export async function invalidateSettings() {
  await cache.del("instance_settings");
}
