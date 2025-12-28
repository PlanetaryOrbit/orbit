import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import * as noblox from "noblox.js";

type Data = {
  success: boolean;
  error?: string;
  available?: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const { username } = req.body;
  if (!username)
    return res.status(400).json({ success: false, error: "Missing username" });

  try {
    const userid = (await noblox
      .getIdFromUsername(username)
      .catch(() => null)) as number | undefined;
    if (!userid) {
      return res
        .status(404)
        .json({ success: false, error: "Roblox username not found" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { userid: BigInt(userid) },
      select: { registered: true, info: { select: { passwordhash: true } } },
    });

    if (existingUser?.registered || existingUser?.info?.passwordhash) {
      return res.status(400).json({
        success: false,
        error: `User ${username} is already registered. Please use the login form instead.`,
        available: false,
      });
    }

    res.status(200).json({ success: true, available: true });
  } catch (error) {
    console.error("Username check error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
