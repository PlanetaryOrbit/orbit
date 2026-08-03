/**
 * Orbit API
 *
 * Fetches Roblox avatar images.
 *
 * Supports headshots, bodyshots, bust shots, custom sizes and circular avatars.
 *
 * @module utils/v2/avatar
 * @since 2.1.10beta21
 * @author BuddyWinte
 */
import cache from "@/utils/cache";

export type AvatarType = "headshot" | "avatar" | "bust" | "fullbody";

const ROBLOX_THUMBNAILS = {
  headshot: "avatar-headshot",
  avatar: "avatar",
  bust: "avatar-bust",
  fullbody: "avatar",
} as const;

const VALID_SIZES = [
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
];

export interface FetchAvatarOptions {
  type?: AvatarType;
  size?: string;
  circular?: boolean;
}

export async function fetchAvatar(
  userId: bigint | number | string,
  options: FetchAvatarOptions = {},
): Promise<string> {
  const { type = "headshot", size = "180x180", circular = false } = options;

  const numericId = String(userId);

  if (!/^\d+$/.test(numericId)) {
    throw new Error("Invalid Roblox user ID");
  }

  const thumbnailType = ROBLOX_THUMBNAILS[type];

  const validSize = VALID_SIZES.includes(size) ? size : "180x180";

  const cacheKey = ["avatar", type, numericId, validSize, circular].join(":");

  const cached = await cache.get<string>(cacheKey);

  if (cached) {
    return cached;
  }

  const url =
    `https://thumbnails.roblox.com/v1/users/${thumbnailType}` +
    `?userIds=${numericId}` +
    `&size=${validSize}` +
    `&format=Png` +
    `&isCircular=${circular}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Roblox thumbnail request failed: ${response.status}`);
  }

  const data = await response.json();

  const image = data?.data?.[0];

  if (!image?.imageUrl) {
    throw new Error("Roblox avatar image unavailable");
  }

  await cache.set(cacheKey, image.imageUrl, 60 * 60);

  return image.imageUrl;
}

export default fetchAvatar;
