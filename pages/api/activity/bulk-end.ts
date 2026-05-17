import type { NextApiResponse } from "next";
import prisma from "@/utils/database";
import { deriveActivityEndChatFields } from "@/utils/activitySessionChat";
import { NextApiRequest } from "next/types";

type Data = {
  success: boolean;
  error?: string;
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
    let processed = 0;
    let failed = 0;
    const updates = sessions.map(async (sessionData: any) => {
      try {
        const { userid, idleTime } = sessionData;

        if (!userid || isNaN(userid)) {
          failed++;
          return;
        }

        const session = await prisma.activitySession.findFirst({
          where: {
            userId: BigInt(userid),
            active: true,
            workspaceGroupId: groupId,
          },
        });

        if (!session) {
          failed++;
          return;
        }

        const { messages: messagesCount, chatLog } =
          deriveActivityEndChatFields(sessionData as Record<string, unknown>);

        await prisma.activitySession.update({
          where: { id: session.id },
          data: {
            endTime: new Date(),
            active: false,
            idleTime: idleTime ? Number(idleTime) : 0,
            messages: messagesCount,
            ...(chatLog !== undefined ? { chatLog } : {}),
          },
        });

        processed++;
        console.log(`[SHUTDOWN RECEIEVED] User ${userid} (ID: ${session.id})`);
      } catch (error) {
        console.error(`Failed to end session for user ${sessionData.userid}:`, error);
        failed++;
      }
    });

    await Promise.all(updates);

    console.log(
      `[SHUTDOWN RECEIEVED] Processed ${processed} sessions, ${failed} failed for group ${groupId}`
    );

    return res.status(200).json({ success: true, processed, failed });
  } catch (error: any) {
    console.error("Unexpected error in /api/activity/bulk-end:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}
