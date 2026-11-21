import cache from '@/utils/cache';

export function accountCacheKey(userId: string | number | bigint): string {
  return `user:${userId}:profile`;
}

export async function invalidateUserProfileCache(userId: string | number | bigint): Promise<void> {
  await cache.del(accountCacheKey(userId));
}
