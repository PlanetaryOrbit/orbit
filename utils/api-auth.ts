import cache from '@/utils/cache';
import prisma from '@/utils/database';

// Validate API key for a given workspace
export async function validateApiKey(apiKey: string, workspaceId: string | number) {
  if (!apiKey || !apiKey.startsWith('orbit_')) return null;

  const numericWorkspaceId =
    typeof workspaceId === 'string' ? parseInt(workspaceId, 10) : workspaceId;

  if (!numericWorkspaceId) return null;

  const cacheKey = `apikey:${apiKey}`;

  const key = await cache.swr(
    cacheKey,
    () =>
      prisma.apiKey.findUnique({
        where: {
          key: apiKey,
        },
      }),
    {
      freshFor: 30,
      staleFor: 300,
    },
  );

  if (!key) return null;

  if (key.expiresAt && key.expiresAt < new Date()) {
    await cache.del(cacheKey);
    return null;
  }

  if (key.workspaceGroupId !== numericWorkspaceId) return null;

  void prisma.apiKey
    .update({
      where: {
        id: key.id,
      },
      data: {
        lastUsed: new Date(),
      },
    })
    .catch(() => {});

  return key;
}
