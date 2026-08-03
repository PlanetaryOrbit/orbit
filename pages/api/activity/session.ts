import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import * as noblox from "noblox.js";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import { checkSpecificUser } from "@/utils/permissionsManager";
import { generateSessionTimeMessage } from "@/utils/sessionMessage";
import { deriveActivityEndChatFields } from "@/utils/activitySessionChat";
import cache from "@/utils/cache";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

type Data = {
  success: boolean;
  error?: string;
  data?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { authorization } = req.headers;

  let config;
  let groupId;

  try {
    if (authorization) {
      const cacheKey = `config:key:${authorization}`;

      config = await cache.get<any>(cacheKey);

      if (!config) {
        config = await prisma.config.findFirst({
          where: {
            value: {
              path: ["key"],
              equals: authorization,
            },
          },
        });

        if (config) {
          await cache.set(cacheKey, config, 300);
        }
      }

      if (!config) {
        return res
          .status(401)
          .json({ success: false, error: "Invalid authorization key" });
      }
    }
  } catch (err) {
    console.error("Unexpected error in /api/activity:", err);

    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }

  if (req.method === "POST") {
    const { userid, placeid, idleTime } = req.body;
    const { type } = req.query;

    if (!userid || isNaN(userid)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing userid" });
    }

    if (!type || typeof type !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "Missing query type (create or end)" });
    }

    try {
      if (req.session?.userId) {
        const workspaceId = req.body.workspaceId;

        if (!workspaceId) {
          return res.status(400).json({
            success: false,
            error: "Workspace ID required for session-based auth",
          });
        }

        const cacheKey = `config:workspace:${workspaceId}`;

        config = await cache.get<any>(cacheKey);

        if (!config) {
          config = await prisma.config.findFirst({
            where: {
              workspaceGroupId: Number(workspaceId),
            },
          });

          if (config) {
            await cache.set(cacheKey, config, 300);
          }
        }

        if (!config) {
          return res
            .status(404)
            .json({ success: false, error: "Workspace not found" });
        }

        groupId = config.workspaceGroupId;
      } else if (config) {
        groupId = config.workspaceGroupId;
      } else {
        return res
          .status(401)
          .json({ success: false, error: "Authorization required" });
      }

      const parsedConfig = JSON.parse(JSON.stringify(config.value));

      const rankCacheKey = `roblox:rank:${groupId}:${userid}`;

      let userRank = await cache.get<number | null>(rankCacheKey);

      if (userRank === null) {
        userRank = await noblox
          .getRankInGroup(groupId, userid)
          .catch(() => null);

        await cache.set(rankCacheKey, userRank, 300);
      }

      if (parsedConfig.role && (!userRank || userRank < parsedConfig.role)) {
        return res.status(200).json({
          success: true,
          error: "User is not the right rank",
        });
      }

      let username = await cache.get<string>(`roblox:username:${userid}`);

      if (!username) {
        username = await getUsername(userid);

        await cache.set(`roblox:username:${userid}`, username, 3600);
      }

      let picture = await cache.get<string>(`roblox:thumbnail:${userid}`);

      if (!picture) {
        picture = getThumbnail(userid);

        await cache.set(`roblox:thumbnail:${userid}`, picture, 3600);
      }

      await prisma.user.upsert({
        where: {
          userid: BigInt(userid),
        },
        update: {
          username,
          picture,
        },
        create: {
          userid: BigInt(userid),
          username,
          picture,
        },
      });

      await checkSpecificUser(userid);

      if (type === "create") {
        const existing = await prisma.activitySession.findFirst({
          where: {
            userId: BigInt(userid),
            active: true,
            workspaceGroupId: groupId,
          },
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            error: "Session already initialized",
          });
        }

        let gameName = null;

        if (placeid) {
          try {
            let universeInfo = await cache.get<any>(
              `roblox:universe:${placeid}`,
            );

            if (!universeInfo) {
              universeInfo = await noblox.getUniverseInfo(Number(placeid));

              await cache.set(
                `roblox:universe:${placeid}`,
                universeInfo,
                86400,
              );
            }

            if (universeInfo?.[0]?.name) {
              gameName = universeInfo[0].name;
            }
          } catch {
            console.log(
              `[WARNING] Could not fetch universe info for place ${placeid}`,
            );
          }
        }

        const sessionStartTime = new Date();

        const sessionMessage = generateSessionTimeMessage(
          gameName,
          sessionStartTime,
        );

        await prisma.activitySession.create({
          data: {
            id: crypto.randomUUID(),
            userId: BigInt(userid),
            active: true,
            startTime: sessionStartTime,
            universeId: placeid ? BigInt(placeid) : null,
            sessionMessage,
            workspaceGroupId: groupId,
          },
        });

        await cache.del(`activity:session:${groupId}:${userid}`);

        return res.status(200).json({
          success: true,
        });
      }

      if (type === "end") {
        const session = await prisma.activitySession.findFirst({
          where: {
            userId: BigInt(userid),
            active: true,
            workspaceGroupId: groupId,
          },
        });

        if (!session) {
          return res.status(400).json({
            success: false,
            error: "Session not found",
          });
        }

        const endTime = new Date();

        const { messages: messagesCount, chatLog } =
          deriveActivityEndChatFields(req.body as Record<string, unknown>);

        await prisma.activitySession.update({
          where: {
            id: session.id,
          },
          data: {
            endTime,
            active: false,
            idleTime: idleTime ? Math.max(0, Number(idleTime)) : 0,
            messages: messagesCount,
            ...(chatLog !== undefined ? { chatLog } : {}),
          },
        });

        await cache.del(`activity:session:${groupId}:${userid}`);

        return res.status(200).json({
          success: true,
        });
      }

      return res.status(400).json({
        success: false,
        error: "Invalid query type",
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  if (req.method === "GET") {
    const { id } = req.query;

    if (!id) {
      return res.status(401).json({
        success: false,
        error: "Session ID required.",
      });
    }

    try {
      if (req.session?.userId) {
        const workspaceId = req.body.workspaceId;

        if (!workspaceId) {
          return res.status(400).json({
            success: false,
            error: "Workspace ID required for session-based auth",
          });
        }

        config = await prisma.config.findFirst({
          where: {
            workspaceGroupId: Number(workspaceId),
          },
        });

        if (!config) {
          return res.status(404).json({
            success: false,
            error: "Workspace not found",
          });
        }

        groupId = config.workspaceGroupId;
      } else if (config) {
        groupId = config.workspaceGroupId;
      } else {
        return res.status(401).json({
          success: false,
          error: "Authorization required",
        });
      }

      const cacheKey = `activity:session:${groupId}:${id}`;

      let session = await cache.get<any>(cacheKey);

      if (!session) {
        session = await prisma.activitySession.findFirst({
          where: {
            userId: BigInt(id.toString()),
            workspaceGroupId: groupId,
            active: true,
          },
        });

        if (session) {
          await cache.set(cacheKey, session, 15);
        }
      }

      if (!session) {
        return res.status(404).json({
          success: false,
          error: "No active session found.",
        });
      }

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}
