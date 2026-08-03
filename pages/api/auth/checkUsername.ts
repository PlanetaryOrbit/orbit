import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import * as noblox from "noblox.js";
import cache from "@/utils/cache";

type Data = {
  success: boolean;
  error?: string;
  available?: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({
      success: false,
      error: "Missing username",
    });
  }

  try {
    const usernameKey = username.toLowerCase();

    let userid = await cache.get<number>(`roblox:id:${usernameKey}`);

    if (!userid) {
      userid = (await noblox.getIdFromUsername(username).catch(() => null)) as
        number | undefined;

      if (!userid) {
        return res.status(404).json({
          success: false,
          error: "Roblox username not found",
        });
      }

      await cache.set(`roblox:id:${usernameKey}`, userid, 3600);
    }

    const cacheKey = `register:check:${userid}`;

    let existingUser = await cache.get<{
      registered: boolean;
      hasPassword: boolean;
    }>(cacheKey);

    if (!existingUser) {
      const user = await prisma.user.findUnique({
        where: {
          userid: BigInt(userid),
        },
        select: {
          registered: true,
          info: {
            select: {
              passwordhash: true,
            },
          },
        },
      });

      existingUser = {
        registered: user?.registered ?? false,
        hasPassword: !!user?.info?.passwordhash,
      };

      await cache.set(cacheKey, existingUser, 60);
    }

    if (existingUser.registered || existingUser.hasPassword) {
      return res.status(400).json({
        success: false,
        error: `User ${username} is already registered. Please use the login form instead.`,
        available: false,
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
    });
  } catch (error) {
    console.error("Username check error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
