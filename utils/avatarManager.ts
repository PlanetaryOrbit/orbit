import fs from "fs";
import path from "path";
import axios from "axios";
import noblox from "noblox.js";

const AVATAR_DIR = path.join(process.cwd(), "public", "avatars");
const AVATAR_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;

export async function getCachedAvatar(userId: number): Promise<string> {
  if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

  const avatarPath = path.join(AVATAR_DIR, `${userId}.png`);
  const avatarUrl = `/avatars/${userId}.png`;

  if (fs.existsSync(avatarPath)) {
    const stats = fs.statSync(avatarPath);
    const now = Date.now();
    if (now - stats.mtimeMs < AVATAR_EXPIRY_MS) {
      return avatarUrl;
    }
  }

  const remoteUrl = await getRemoteAvatarUrl(userId);
  const response = await axios.get(remoteUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(avatarPath, response.data);

  return avatarUrl;
}

async function getRemoteAvatarUrl(userId: number): Promise<string> {
  const thumbnails = await noblox.getPlayerThumbnail([userId], 180, "png", false, "headshot");
  if (thumbnails && thumbnails[0] && thumbnails[0].imageUrl) {
    return thumbnails[0].imageUrl;
  }
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=180&height=180&format=png`;
}

export {};