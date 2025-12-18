import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { NextApiRequest, NextApiResponse } from "next";

export default withSessionRoute(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = req.session.userid;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  const { timezone } = req.body;

  if (!timezone || typeof timezone !== "string") {
    return res.status(400).json({ error: "Invalid timezone" });
  }

  try {
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceGroupId_userId: {
          workspaceGroupId: parseInt(id as string),
          userId: BigInt(userId),
        },
      },
      select: {
        timezone: true,
      },
    });
    if (!existingMember?.timezone) {
      await prisma.workspaceMember.update({
        where: {
          workspaceGroupId_userId: {
            workspaceGroupId: parseInt(id as string),
            userId: BigInt(userId),
          },
        },
        data: {
          timezone: timezone,
        },
      });

      return res.status(200).json({ success: true, updated: true });
    }

    return res.status(200).json({ success: true, updated: false });
  } catch (error) {
    console.error("Error updating timezone:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
