import type { NextApiRequest, NextApiResponse } from 'next';
import fs from "fs";
import path from "path";
import { getCachedAvatar } from "@/utils/avatarManager";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userid } = req.query;
  if (!userid || Array.isArray(userid)) {
    return res.status(400).end("Invalid userId");
  }

  await getCachedAvatar(Number(userid));

  const avatarPath = path.join(process.cwd(), "public", "avatars", `${userid}.png`);
  if (fs.existsSync(avatarPath)) {
    res.setHeader("Content-Type", "image/png");
    fs.createReadStream(avatarPath).pipe(res as any);
  } else {
    res.status(404).end("Not found");
  }
}