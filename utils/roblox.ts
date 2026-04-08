import noblox from "noblox.js";

const TIMEOUT_MS = 12000;

async function withTimeout<T>(promise: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms)
    ),
  ]);
}

export interface RobloxUserInfo {
  username: string;
  displayName: string;
}

export async function getRobloxUserInfo(id: number | bigint): Promise<RobloxUserInfo> {
  try {
    const userInfo = await withTimeout(noblox.getUserInfo(Number(id)));
    return {
      username: userInfo.name ?? "Unknown User",
      displayName: userInfo.displayName ?? userInfo.name ?? "Unknown User",
    };
  } catch (error) {
    console.error(`Error getting user info for user ${id}:`, error);
    return { username: "Unknown User", displayName: "Unknown User" };
  }
}

export async function getRobloxThumbnail(id: number | bigint): Promise<string> {
  try {
    const thumbnails = await withTimeout(
      noblox.getPlayerThumbnail(Number(id), "720x720", "png", false, "headshot")
    );
    return thumbnails[0]?.imageUrl ?? "";
  } catch (error) {
    console.error(`Error getting thumbnail for user ${id}:`, error);
    return "";
  }
}

export async function getRobloxUserId(username: string): Promise<number> {
  try {
    return await withTimeout(noblox.getIdFromUsername(username));
  } catch (error) {
    console.error(`Error getting user ID for username ${username}:`, error);
    throw error;
  }
}

// Keep individual exports
export const getRobloxUsername = async (id: number | bigint) =>
  (await getRobloxUserInfo(id)).username;

export const getRobloxDisplayName = async (id: number | bigint) =>
  (await getRobloxUserInfo(id)).displayName;