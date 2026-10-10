import cache from '@/utils/cache';

import type { MediaInfo } from './media';

const prefix = 'media:';
const ttl = 60 * 60;

export function mediaCacheKey(id: string) {
  return `${prefix}${id}`;
}

export async function getCachedMedia(id: string) {
  return cache.get<MediaInfo>(mediaCacheKey(id));
}

export async function setCachedMedia(id: string, media: MediaInfo) {
  await cache.set(mediaCacheKey(id), media, ttl);
}

export async function clearCachedMedia(id: string) {
  await cache.del(mediaCacheKey(id));
}
