import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import * as noblox from "noblox.js";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import { checkSpecificUser } from "@/utils/permissionsManager";
import { generateSessionTimeMessage } from "@/utils/sessionMessage";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

type Data = {
  success: boolean;
  error?: string;
  started?: number[];
  processed?: number;
  failed?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { authorization } = req.headers;
  const { sessions } = req.body;

  if (!authorization)
    return res
      .status(400)
      .json({ success: false, error: "Authorization key missing" });

  if (!sessions || !Array.isArray(sessions))
    return res
      .status(400)
      .json({ success: false, error: "Sessions array is required" });

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

    let processed = 0;
    let failed = 0;
    const started: number[] = [];

    const creations = sessions.map(async (sessionData: any) => {
      try {
        const { userid, placeid } = sessionData;

        if (!userid || isNaN(userid)) {
          failed++;
          return;
        }

        const existing = await prisma.activitySession.findFirst({
          where: {
            userId: BigInt(userid),
            active: true,
            workspaceGroupId: groupId,
          },
        });

        if (existing) {
          started.push(Number(userid));
          processed++;
          return;
        }

        const userRank = await noblox
          .getRankInGroup(groupId, userid)
          .catch(() => null);

        if (parsedConfig.role && (!userRank || userRank <= parsedConfig.role)) {
          failed++; // not eligible
          return;
        }

        const username = await getUsername(userid);
        const picture = getThumbnail(userid);

        try {
          await prisma.user.upsert({
            where: { userid: BigInt(userid) },
            update: { username, picture },
            create: { userid: BigInt(userid), username, picture },
          });
        } catch (error) {
          console.error(`[ERROR] Failed to upsert user ${userid}:`, error);
          failed++;
          return;
        }

        await checkSpecificUser(userid);

        let gameName = null;
        if (placeid) {
          try {
            const universeInfo: any = await noblox.getUniverseInfo(Number(placeid));
            if (universeInfo && universeInfo[0] && universeInfo[0].name) {
              gameName = universeInfo[0].name;
            }
          } catch (error) {
            console.log(`[WARNING] Could not fetch universe info for place ${placeid}`);
          }
        }

        const sessionStartTime = new Date();
        const sessionMessage = generateSessionTimeMessage(gameName, sessionStartTime);

        await prisma.activitySession.create({
          data: {
            id: crypto.randomUUID(),
            userId: BigInt(userid),
            active: true,
            startTime: sessionStartTime,
            universeId: placeid ? BigInt(placeid) : null,
            sessionMessage: sessionMessage,
            workspaceGroupId: groupId,
          },
        });

        started.push(Number(userid));
        processed++;
        console.log(`[BULK SESSION STARTED] User ${userid} for group ${groupId} - ${sessionMessage}`);
      } catch (error) {
        console.error(`Failed to start session for user ${sessionData.userid}:`, error);
        failed++;
      }
    });

    await Promise.all(creations);

    console.log(
      `[BULK START] Processed ${processed} sessions, ${failed} failed for group ${groupId}`
    );

    return res.status(200).json({ success: true, started, processed, failed });
  } catch (error: any) {
    console.error("Unexpected error in /api/activity/bulk-start:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}