/**
 * Orbit API
 *
 * Fetches Roblox avatar thumbnail URLs.
 *
 * Uses Roblox CDN URLs directly instead of proxying images.
 *
 * @module utils/v2/avatar
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

import cache from "@/utils/cache";

export type AvatarType =
  | "headshot"
  | "avatar"
  | "bust"
  | "fullbody";

const ROBLOX_THUMBNAILS = {
  headshot: "avatar-headshot",
  avatar: "avatar",
  bust: "avatar-bust",
  fullbody: "avatar",
} as const;

const VALID_SIZES = new Set([
  "48x48",
  "50x50",
  "60x60",
  "75x75",
  "100x100",
  "110x110",
  "150x150",
  "180x180",
  "250x250",
  "352x352",
  "420x420",
  "720x720",
]);

export interface FetchAvatarOptions {
  type?: AvatarType;
  size?: string;
  circular?: boolean;
}

export interface RobloxThumbnail {
  targetId: number;
  state: string;
  imageUrl: string | null;
}

export async function fetchAvatar(
  userId: bigint | number | string,
  options: FetchAvatarOptions = {},
): Promise<string | null> {
  const {
    type = "headshot",
    size = "180x180",
    circular = false,
  } = options;

  const id = String(userId);

  if (!/^\d+$/.test(id)) {
    return null;
  }

  const validSize = VALID_SIZES.has(size)
    ? size
    : "180x180";

  const key = [
    "roblox",
    "avatar",
    type,
    id,
    validSize,
    circular,
  ].join(":");

  const cached = await cache.get<string>(key);

  if (cached) {
    return cached;
  }

  try {
    const endpoint = ROBLOX_THUMBNAILS[type];

    const response = await fetch(
      "https://thumbnails.roblox.com/v1/users/" +
        `${endpoint}?userIds=${id}` +
        `&size=${validSize}` +
        "&format=Png" +
        `&isCircular=${circular}`,
    );

    if (!response.ok) {
      return null;
    }

    const body = await response.json();

    const image =
      body.data?.[0] as RobloxThumbnail | undefined;

    if (!image?.imageUrl) {
      await cache.set(key, "null", 300);
      return null;
    }

    await cache.set(
      key,
      image.imageUrl,
      60 * 60 * 24,
    );

    return image.imageUrl;
  } catch {
    return null;
  }
}

export async function fetchAvatars(
  userIds: Array<bigint | number | string>,
  options: FetchAvatarOptions = {},
): Promise<Record<string, string | null>> {
  const {
    type = "headshot",
    size = "180x180",
    circular = false,
  } = options;

  const ids = userIds
    .map(String)
    .filter((id) => /^\d+$/.test(id));

  if (!ids.length) {
    return {};
  }

  const validSize = VALID_SIZES.has(size)
    ? size
    : "180x180";

  const result: Record<string, string | null> = {};

  const missing: string[] = [];

  for (const id of ids) {
    const key = [
      "roblox",
      "avatar",
      type,
      id,
      validSize,
      circular,
    ].join(":");

    const cached = await cache.get<string>(key);

    if (cached && cached !== "null") {
      result[id] = cached;
    } else {
      missing.push(id);
    }
  }

  if (!missing.length) {
    return result;
  }

  const endpoint = ROBLOX_THUMBNAILS[type];

  const response = await fetch(
    "https://thumbnails.roblox.com/v1/users/" +
      `${endpoint}?userIds=${missing.join(",")}` +
      `&size=${validSize}` +
      "&format=Png" +
      `&isCircular=${circular}`,
  );

  if (!response.ok) {
    return result;
  }

  const body = await response.json();

  for (const image of body.data ?? []) {
    const id = String(image.targetId);
    const key = [
      "roblox",
      "avatar",
      type,
      id,
      validSize,
      circular,
    ].join(":");

    const url = image.imageUrl ?? null;

    result[id] = url;

    await cache.set(
      key,
      url ?? "null",
      url ? 86400 : 300,
    );
  }

  return result;
}

export default fetchAvatar;
