import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";

export default withSessionRoute(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const workspaceGroupId = parseInt(req.query.id as string, 10);
  if (!workspaceGroupId) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid workspace id" });
  }

  const currentUserId = req.session?.userid;
  if (!currentUserId) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const user = await prisma.user.findFirst({
    where: {
      userid: BigInt(currentUserId),
    },
    include: {
      roles: {
        where: {
          workspaceGroupId,
        },
      },
      workspaceMemberships: {
        where: {
          workspaceGroupId,
        },
      },
    },
  });

  const membership = user?.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const hasManageMembersPermission =
    isAdmin ||
    (user?.roles?.some((role) => role.permissions?.includes("record_notices")) ??
    false);

  if (!hasManageMembersPermission) {
    return res
      .status(403)
      .json({ success: false, error: "Insufficient permissions" });
  }

  const { userId, startTime, endTime, reason } = req.body;

  if (!userId || !startTime || !endTime || !reason) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: userId, startTime, endTime, reason",
    });
  }

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: "End time must be after start time",
      });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId,
          },
        },
      },
    });

    if (!targetUser || !targetUser.roles.length) {
      return res.status(404).json({
        success: false,
        error: "User not found in workspace",
      });
    }

    const notice = await prisma.inactivityNotice.create({
      data: {
        userId: BigInt(userId),
        workspaceGroupId,
        startTime: start,
        endTime: end,
        reason: reason.trim(),
        reviewed: true,
        approved: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Notice created successfully",
      notice: {
        id: notice.id,
        startTime: notice.startTime,
        endTime: notice.endTime,
        reason: notice.reason,
        approved: notice.approved,
        reviewed: notice.reviewed,
      },
    });
  } catch (error) {
    console.error("Error creating admin notice:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});