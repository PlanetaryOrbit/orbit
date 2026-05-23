import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ( req.method !== "GET" && req.method !== "POST" && req.method !== "PATCH" && req.method !== "DELETE") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = Number.parseInt(req.query.id as string);
  if (!workspaceId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  }

  if (req.method === "GET") {
    try {
      const resignations = await prisma.staffResignation.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
        select: {
          id: true,
          userId: true,
          lastWorkingDay: true,
          reason: true,
          approved: true,
          reviewed: true,
          reviewComment: true,
          createdAt: true,
          updatedAt: true,
          reviewerId: true,
          user: {
            select: {
              username: true,
              picture: true,
            },
          },
          reviewer: {
            select: {
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formattedResponse = resignations.map((resignation) => ({
        id: resignation.id,
        userId: resignation.userId,
        username: resignation.user.username,
        lastWorkingDay: resignation.lastWorkingDay,
        reason: resignation.reason,
        approved: resignation.approved,
        reviewed: resignation.reviewed,
        reviewComment: resignation.reviewComment,
        createdAt: resignation.createdAt,
        updatedAt: resignation.updatedAt,
        reviewerName: resignation.reviewer?.username || null,
        reviewerId: resignation.reviewerId,
      }));

      return res.status(200).json({ success: true, data: formattedResponse });
    } catch (error) {
      console.error("Error fetching resignations:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const { reason, lastWorkingDay, userId } = req.body;

    if (!reason || !lastWorkingDay || !userId) {
      return res.status(400).json({
        success: false,
        error: "Reason, lastWorkingDay, and userId are required",
      });
    }

    if (typeof reason !== "string") {
      return res.status(400).json({
        success: false,
        error: "Reason must be a string",
      });
    }

    const userIdBigInt = BigInt(userId);
    if (!userIdBigInt) {
      return res.status(400).json({
        success: false,
        error: "Invalid userId",
      });
    }

    const lastWorkingDayDate = new Date(lastWorkingDay);
    if (isNaN(lastWorkingDayDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid lastWorkingDay format",
      });
    }

    if (lastWorkingDayDate < new Date()) {
      return res.status(400).json({
        success: false,
        error: "Last working day must be in the future",
      });
    }

    try {
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceGroupId_userId: {
            workspaceGroupId: workspaceId,
            userId: userIdBigInt,
          },
        },
      });

      if (!workspaceMember) {
        return res.status(404).json({
          success: false,
          error: "User is not a member of this workspace",
        });
      }

      const existingPendingResignation =
        await prisma.staffResignation.findFirst({
          where: {
            userId: userIdBigInt,
            workspaceGroupId: workspaceId,
            approved: false,
            reviewed: false,
          },
        });

      if (existingPendingResignation) {
        return res.status(409).json({
          success: false,
          error: "User already has a pending resignation",
        });
      }

      const newResignation = await prisma.staffResignation.create({
        data: {
          userId: userIdBigInt,
          workspaceGroupId: workspaceId,
          reason: reason,
          lastWorkingDay: lastWorkingDayDate,
          approved: false,
          reviewed: false,
          reviewComment: null,
        },
        include: {
          user: {
            select: {
              username: true,
              picture: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          id: newResignation.id,
          userId: newResignation.userId,
          username: newResignation.user.username,
          reason: newResignation.reason,
          lastWorkingDay: newResignation.lastWorkingDay,
          approved: newResignation.approved,
          reviewed: newResignation.reviewed,
          createdAt: newResignation.createdAt,
        },
      });
    } catch (error) {
      console.error("Error creating resignation:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "PATCH") {
    const { noticeId, approved, reviewComment } = req.body;

    if (!noticeId) {
      return res.status(400).json({
        success: false,
        error: "Notice ID is required",
      });
    }

    try {
      const notice = await prisma.inactivityNotice.findFirst({
        where: {
          id: noticeId,
          workspaceGroupId: workspaceId,
        },
      });

      if (!notice) {
        return res.status(404).json({
          success: false,
          error: "Inactivity notice not found",
        });
      }

      if (notice.revoked) {
        return res.status(409).json({
          success: false,
          error: "Cannot update a revoked notice",
        });
      }

      const updatedNotice = await prisma.inactivityNotice.update({
        where: {
          id: noticeId,
        },
        data: {
          approved: approved !== undefined ? approved : notice.approved,
          reviewed: true,
          reviewComment: reviewComment || null,
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          id: updatedNotice.id,
          userId: updatedNotice.userId,
          username: updatedNotice.user.username,
          approved: updatedNotice.approved,
          reviewed: updatedNotice.reviewed,
          reviewComment: updatedNotice.reviewComment,
          startTime: updatedNotice.startTime,
          endTime: updatedNotice.endTime,
          revoked: updatedNotice.revoked,
        },
      });
    } catch (error) {
      console.error("Error updating inactivity notice:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    const { resignationId } = req.body;

    if (!resignationId) {
      return res.status(400).json({
        success: false,
        error: "Resignation ID is required",
      });
    }

    try {
      const resignation = await prisma.staffResignation.findFirst({
        where: {
          id: resignationId,
          workspaceGroupId: workspaceId,
        },
      });

      if (!resignation) {
        return res.status(404).json({
          success: false,
          error: "Resignation not found",
        });
      }

      if (resignation.reviewed) {
        return res.status(409).json({
          success: false,
          error: "Cannot cancel a resignation that has already been reviewed",
        });
      }

      await prisma.staffResignation.delete({
        where: {
          id: resignationId,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Resignation cancelled successfully",
      });
    } catch (error) {
      console.error("Error cancelling resignation:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }
}
