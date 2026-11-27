import cache from '@/utils/cache';
import prisma from '@/utils/database';

const API_KEY_CACHE_PREFIX = 'apikey:';
const API_KEY_REVOKED_PREFIX = 'apikey:revoked:';
// Longer than the SWR stale window so an in-flight load cannot resurrect a deleted key.
const API_KEY_REVOKED_TTL = 600;

function revokedCacheKey(apiKey: string): string {
  return `${API_KEY_REVOKED_PREFIX}${apiKey}`;
}

async function isApiKeyRevoked(apiKey: string): Promise<boolean> {
  try {
    return await cache.hasStrict(revokedCacheKey(apiKey));
  } catch {
    // Fail closed: if revocation state cannot be read, reject the key.
    return true;
  }
}

export async function revokeApiKeyCache(apiKey: string): Promise<void> {
  await cache.setStrict(revokedCacheKey(apiKey), true, API_KEY_REVOKED_TTL);
  await cache.delStrict(`${API_KEY_CACHE_PREFIX}${apiKey}`);
}

// Validate API key for a given workspace
export async function validateApiKey(apiKey: string, workspaceId: string | number) {
  if (!apiKey || !apiKey.startsWith('orbit_')) return null;

  const numericWorkspaceId =
    typeof workspaceId === 'string' ? parseInt(workspaceId, 10) : workspaceId;

  if (!numericWorkspaceId) return null;

  const cacheKey = `${API_KEY_CACHE_PREFIX}${apiKey}`;

  if (await isApiKeyRevoked(apiKey)) return null;

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

  // A load started before revocation may have written a stale row after the delete.
  if (await isApiKeyRevoked(apiKey)) return null;
  if (!key) return null;

  if (key.expiresAt && key.expiresAt < new Date()) {
    await revokeApiKeyCache(apiKey);
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
