import type { NextApiRequest, NextApiResponse } from 'next';
import fs from "fs";
import path from "path";
import axios from "axios";
import noblox from "noblox.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userid } = req.query;
  if (!userid || Array.isArray(userid)) {
    return res.status(400).end("Invalid userId");
  }
  const numericUserId = Number(userid);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return res.status(400).end("Invalid userId");
  }

  const avatarPath = path.join(process.cwd(), "public", "avatars", `${numericUserId}.png`);

  try {
    if (!fs.existsSync(path.dirname(avatarPath))) {
      fs.mkdirSync(path.dirname(avatarPath), { recursive: true });
    }

    if (fs.existsSync(avatarPath)) {
      res.setHeader("Content-Type", "image/png");
      fs.createReadStream(avatarPath).pipe(res as any);
      return;
    }

    const remoteUrl = await getRemoteAvatarUrl(numericUserId);
    const response = await axios.get(remoteUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(avatarPath, response.data);


    res.setHeader("Content-Type", "image/png");
    res.send(response.data);
  } catch (err) {
    try {
      const remoteUrl = await getRemoteAvatarUrl(numericUserId);
      const response = await axios.get(remoteUrl, { responseType: "arraybuffer" });
      res.setHeader("Content-Type", "image/png");
      res.send(response.data);
    } catch {
      res.status(404).end("Not found");
    }
  }
}

async function getRemoteAvatarUrl(userid: number): Promise<string> {
  const thumbnails = await noblox.getPlayerThumbnail([userid], 180, "png", false, "headshot");
  if (thumbnails && thumbnails[0] && thumbnails[0].imageUrl) {
    return thumbnails[0].imageUrl;
  }
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userid}&width=180&height=180&format=png`;
}
