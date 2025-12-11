import { withPermissionCheck } from "@/utils/permissionsManager";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

export default withPermissionCheck(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const { id } = req.query;
  const userId = req.session.userid;

  if (!userId)
    return res.status(401).json({ success: false, error: "Unauthorized" });

  const workspaceGroupId = parseInt(id as string);

  try {
    const userRoles = await prisma.role.findMany({
      where: {
        workspaceGroupId,
        members: {
          some: {
            userid: BigInt(userId),
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!userRoles.length) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const roleIds = userRoles.map((r) => r.id);
    const policies = await prisma.document.findMany({
      where: {
        workspaceGroupId,
        requiresAcknowledgment: true,
        roles: {
          some: {
            id: {
              in: roleIds,
            },
          },
        },
      },
      select: {
        id: true,
        acknowledgments: {
          where: {
            userId: BigInt(userId),
          },
          select: {
            id: true,
          },
        },
      },
    });

    const pendingCount = policies.filter(
      (p) => p.acknowledgments.length === 0
    ).length;
    return res.status(200).json({ success: true, count: pendingCount });
  } catch (error) {
    console.error("Error fetching pending policy count:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});
