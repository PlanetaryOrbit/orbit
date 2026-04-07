import NodeCache from "node-cache";
import { getRobloxUserInfo, getRobloxUsername } from "@/utils/roblox";

const cache = new NodeCache({ stdTTL: 300 });

const toNumber = (userId: number | bigint) => Number(userId);
const key = (prefix: string, userId: number) => `${prefix}:${userId}`;

async function getCachedUserInfo(userId: number) {
  const usernameKey = key("username", userId);
  const displayNameKey = key("displayname", userId);

  const cachedUsername = cache.get<string>(usernameKey);
  const cachedDisplayName = cache.get<string>(displayNameKey);

  if (cachedUsername !== undefined && cachedDisplayName !== undefined) {
    return { username: cachedUsername, displayName: cachedDisplayName };
  }

  // one api call for both username and display name
  const info = await getRobloxUserInfo(userId);
  cache.set(usernameKey, info.username);
  cache.set(displayNameKey, info.displayName);
  return info;
}

export async function getUsername(userId: number | bigint): Promise<string> {
  return (await getCachedUserInfo(toNumber(userId))).username;
}

export async function getDisplayName(userId: number | bigint): Promise<string> {
  return (await getCachedUserInfo(toNumber(userId))).displayName;
}

export function getThumbnail(userId: number | bigint): string {
  return `/api/workspace/[id]/avatar/${userId}`;
}

export { getRobloxUsername };