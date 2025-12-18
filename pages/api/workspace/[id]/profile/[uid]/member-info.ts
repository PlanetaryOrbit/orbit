import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceId = Number(req.query.id as string);
  const userId = String(req.query.uid as string);

  if (!workspaceId || !userId) {
    return res.status(400).json({ success: false, error: "Missing workspace ID or user ID" });
  }

  if (req.method === "PATCH") {
    try {
      const { department, lineManagerId, timezone, birthdayDay, birthdayMonth, discordId } = req.body;
      await prisma.workspaceMember.upsert({
        where: {
          workspaceGroupId_userId: {
            workspaceGroupId: workspaceId,
            userId: BigInt(userId),
          },
        },
        update: {
          department,
          lineManagerId: lineManagerId ? BigInt(lineManagerId) : null,
          timezone,
          discordId,
        },
        create: {
          workspaceGroupId: workspaceId,
          userId: BigInt(userId),
          department,
          lineManagerId: lineManagerId ? BigInt(lineManagerId) : null,
          timezone,
          discordId,
        },
      });

      await prisma.user.update({
        where: {
          userid: BigInt(userId),
        },
        data: {
          birthdayDay: birthdayDay !== undefined ? birthdayDay : undefined,
          birthdayMonth: birthdayMonth !== undefined ? birthdayMonth : undefined,
        },
      });

      return res.status(200).json({ 
        success: true
      });
    } catch (e) {
      console.error("Update member info error:", e);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withSessionRoute(handler);
