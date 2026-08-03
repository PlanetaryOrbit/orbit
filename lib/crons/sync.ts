/**
 * Orbit API
 *
 * Cron that automatically updates the robloxData field of every user.
 *
 * Runs every 30 minutes.
 *
 * @module lib/crons/sync
 * @since 3.0.0
 * @author BuddyWinte
 */

import { prisma } from "@/lib/prisma";
import fetchAvatar from "@/utils/avatar";

export async function syncRobloxData(
  userId: string,
  robloxId: bigint,
) {
  try {
    const response = await fetch(
      `https://users.roblox.com/v1/users/${robloxId}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Roblox user");
    }

    const roblox = await response.json();

    const avatarUrl = await fetchAvatar(robloxId).catch(
      () => null,
    );

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        robloxData: {
          username: roblox.name,
          displayName: roblox.displayName,
          hasVerifiedBadge: roblox.hasVerifiedBadge,
          isBanned: roblox.isBanned,
          avatarUrl,
          syncedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error(
      `[CRON] Failed syncing Roblox profile for ${userId}:`,
      err,
    );
  }
}

export async function syncAllRobloxData() {
  console.log("[CRON] Starting Roblox data sync...");

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        robloxId: true,
      },
    });

    for (const user of users) {
      await syncRobloxData(
        user.id,
        user.robloxId,
      );
    }

    console.log(
      `[CRON] Roblox data sync completed (${users.length} users).`,
    );
  } catch (err) {
    console.error(
      "[CRON] Roblox data sync failed:",
      err,
    );
  }
}
