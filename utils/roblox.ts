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

export async function getRobloxUsername(id: number | bigint) {
  try {
    return await withTimeout(noblox.getUsernameFromId(Number(id)));
  } catch (error) {
    console.error(`Error getting username for user ${id}:`, error);
    return "Unknown User";
  }
}

export async function getRobloxThumbnail(id: number | bigint) {
  try {
    const thumbnails = await withTimeout(
      noblox.getPlayerThumbnail(Number(id), "720x720", "png", false, "headshot")
    );
    return thumbnails[0].imageUrl;
  } catch (error) {
    console.error(`Error getting thumbnail for user ${id}:`, error);
    return "";
  }
}

export async function getRobloxDisplayName(id: number | bigint) {
  try {
    const userInfo = await withTimeout(noblox.getUserInfo(Number(id)));
    return userInfo.displayName || "Unknown User";
  } catch (error) {
    console.error(`Error getting display name for user ${id}:`, error);
    try {
      return await getRobloxUsername(id);
    } catch {
      return "Unknown User";
    }
  }
}

export async function getRobloxUserId(username: string, origin?: string): Promise<number> {
  try {
    const id = await withTimeout(noblox.getIdFromUsername(username));
    return id;
  } catch (error) {
    console.error(`Error getting user ID for username ${username}:`, error);
    throw error;
  }
}