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
 import type { InstanceSettings } from "@prisma/client";
 import type { ClientInstanceSettings } from "./types";

 export type { ClientInstanceSettings } from "./types";

export function serializeSettings(
  settings: InstanceSettings,
): ClientInstanceSettings {
  const {
    id,
    updatedAt,
    ...rest
  } = settings;

  return {
    ...rest,
    createdAt: settings.createdAt.toISOString(),
  };
}

export async function getSettings(): Promise<InstanceSettings> {
  const cached = await cache.get<InstanceSettings>(
    "instance_settings",
  );

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
  data: Partial<
    Omit<InstanceSettings, "id" | "createdAt" | "updatedAt">
  >,
) {

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
  await cache.set(
    "instance_settings",
    settings,
    60 * 60,
  );

  return settings;
}

export async function invalidateSettings() {
  await cache.del("instance_settings");
}
