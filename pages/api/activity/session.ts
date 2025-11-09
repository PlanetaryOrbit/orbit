// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import * as noblox from "noblox.js";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import { checkSpecificUser } from "@/utils/permissionsManager";
import { generateSessionTimeMessage } from "@/utils/sessionMessage";

type Data = {
  success: boolean;
  error?: string;
};

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { authorization } = req.headers;
  const { userid, placeid, idleTime, messages } = req.body;
  const { type } = req.query;
  if (!authorization)
    return res
      .status(400)
      .json({ success: false, error: "Authorization key missing" });
  if (!userid || isNaN(userid))
    return res
      .status(400)
      .json({ success: false, error: "Invalid or missing userid" });
  if (!type || typeof type !== "string")
    return res
      .status(400)
      .json({ success: false, error: "Missing query type (create or end)" });

  try {
    const config = await prisma.config.findFirst({
      where: {
        value: {
          path: ["key"],
          equals: authorization,
        },
      },
    });

    if (!config) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const groupId = config.workspaceGroupId;
    const parsedConfig = JSON.parse(JSON.stringify(config.value));

    const userRank = await noblox
      .getRankInGroup(groupId, userid)
      .catch(() => null);
    await checkSpecificUser(userid);

    if (parsedConfig.role && (!userRank || userRank <= parsedConfig.role)) {
      console.log(
        `[BLOCKED] User ${userid} has insufficient rank (${userRank})`
      );
      return res
        .status(200)
        .json({ success: true, error: "User is not the right rank" });
    }

    const username = await getUsername(userid);
    const picture = await getThumbnail(userid);

    await prisma.user.upsert({
      where: { userid: BigInt(userid) },
      update: { username, picture },
      create: { userid: BigInt(userid), username, picture },
    });

    // Handle session type
    if (type === "create") {
      const existing = await prisma.activitySession.findFirst({
        where: {
          userId: BigInt(userid),
          active: true,
          workspaceGroupId: groupId,
        },
      });

      if (existing) {
        return res
          .status(400)
          .json({ success: false, error: "Session already initialized" });
      }

      let gameName = null;
      if (placeid) {
        try {
          const universeInfo: any = await noblox.getUniverseInfo(
            Number(placeid)
          );
          if (universeInfo && universeInfo[0] && universeInfo[0].name) {
            gameName = universeInfo[0].name;
          }
        } catch (error) {
          console.log(
            `[WARNING] Could not fetch universe info for place ${placeid}`
          );
        }
      }

      const sessionStartTime = new Date();
      const sessionMessage = generateSessionTimeMessage(
        gameName,
        sessionStartTime
      );

      await prisma.activitySession.create({
        data: {
          userId: BigInt(userid),
          active: true,
          startTime: sessionStartTime,
          universeId: placeid ? BigInt(placeid) : null,
          sessionMessage: sessionMessage,
          workspaceGroupId: groupId,
        },
      });

      console.log(
        `[SESSION STARTED] User ${userid} for group ${groupId} - ${sessionMessage}`
      );
      return res.status(200).json({ success: true });
    } else if (type === "end") {
      const session = await prisma.activitySession.findFirst({
        where: {
          userId: BigInt(userid),
          active: true,
          workspaceGroupId: groupId,
        },
      });

      if (!session) {
        return res
          .status(400)
          .json({ success: false, error: "Session not found" });
      }

      await prisma.activitySession.update({
        where: { id: session.id },
        data: {
          endTime: new Date(),
          active: false,
          idleTime: idleTime ? Number(idleTime) : 0,
          messages: messages ? Number(messages) : 0,
        },
      });

      console.log(`[SESSION ENDED] User ${userid} (ID: ${session.id})`);
      return res.status(200).json({ success: true });
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Invalid query type" });
    }
  } catch (error: any) {
    console.error("Unexpected error in /api/activity:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}
