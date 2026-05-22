import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { getUserRank } from "@/utils/roblox";
import { getConfig } from "@/utils/configEngine";
import { withKey } from "@/lib/withAuth";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const workspaceId = Number.parseInt(req.query.id as string);
  if (!workspaceId)
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).send({
      success: false,
      error: "No User ID provided.",
    });
  }
  const now = new Date();
  try {
    const user = await prisma.workspaceMember.findFirst({
      where: {
        userId: BigInt(userId.toString()),
      },
      include: {
        user: true,
        lineManager: true,
        workspace: {
          include: {
            inactivityNotices: {
              where: {
                userId: BigInt(userId.toString()),
                approved: true,
                revoked: false,
                startTime: { lte: now },
                endTime: { gte: now },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "User does not exist.",
      });
    }

    const openCloudKey = await getConfig("roblox_opencloud", workspaceId);

    const rankInfo = await getUserRank(
      BigInt(userId.toString()),
      BigInt(workspaceId),
      openCloudKey && openCloudKey.enabled ? openCloudKey.key : null,
    );

    const { workspace, ...userData } = user;

    return res.status(200).send({
      success: true,
      data: {
        ...userData,
        workspaceName: workspace.groupName,
        rank: rankInfo ?? null,
        notice: workspace.inactivityNotices[0] ?? null,
      },
    });
  } catch (error) {
    console.error("Error in public API:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}
