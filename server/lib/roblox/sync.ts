import { db } from '~~/server/database/client';
import fetchAvatar from '~~/server/utils/avatar';

export async function syncRobloxData(userId: string, robloxId: string) {
  try {
    const response = await fetch(`https://users.roblox.com/v1/users/${robloxId}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Roblox user');
    }

    const roblox = await response.json();

    const avatarUrl = await fetchAvatar(robloxId).catch(() => null);

    await db.orm.public.User.where({
      id: userId,
    }).update({
      robloxData: {
        username: roblox.name,
        displayName: roblox.displayName,
        hasVerifiedBadge: roblox.hasVerifiedBadge,
        isBanned: roblox.isBanned,
        avatarUrl,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error(`[CRON] Failed syncing Roblox profile for ${userId}:`, err);
  }
}
