import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PATCH" && req.method !== "DELETE") {
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
      const notices = await prisma.inactivityNotice.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
        select: {
          approved: true,
          id: true,
          endTime: true,
          reason: true,
          reviewed: true,
          revoked: true,
          user: {
            select: {
              username: true,
            },
          },
          userId: true,
          startTime: true,
          reviewComment: true,
        },
        orderBy: {
          startTime: "desc",
        },
      });

      const formattedResponse = notices.map((notice) => ({
        approved: notice.approved,
        id: notice.id,
        endTime: notice.endTime,
        reason: notice.reason,
        reviewed: notice.reviewed,
        revoked: notice.revoked,
        username: notice.user.username,
        userId: notice.userId,
        startTime: notice.startTime,
        reviewComment: notice.reviewComment,
      }));

      return res.status(200).json({ success: true, data: formattedResponse });
    } catch (error) {
      console.error("Error fetching notices:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const { reason, startTime, endTime, userId } = req.body;

    if (!reason || !endTime || !userId) {
      return res.status(400).json({
        success: false,
        error: "Reason, endTime, and userId are required",
      });
    }

    if (!reason || typeof reason !== "string") {
      return res.status(400).json({
        success: false,
        error: "Reason is required and must be a string",
      });
    }

    const userIdBigInt = BigInt(userId);
    if (!userIdBigInt) {
      return res.status(400).json({
        success: false,
        error: "Invalid userId",
      });
    }

    const startDateTime = startTime ? new Date(startTime) : new Date();
    const endDateTime = new Date(endTime);

    if (startDateTime.getTime() < new Date().getTime()) {
      return res.status(400).json({
        success: false,
        error: "Start time must be in the future",
      });
    }

    if (isNaN(endDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid endTime format",
      });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        success: false,
        error: "End time must be after start time",
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

      const existingActiveNotice = await prisma.inactivityNotice.findFirst({
        where: {
          userId: userIdBigInt,
          workspaceGroupId: workspaceId,
          approved: true,
          revoked: false,
          endTime: {
            gt: new Date(), // verify if theres an active notice on said user
          },
        },
      });

      if (existingActiveNotice) {
        return res.status(409).json({
          success: false,
          error: "User already has an active inactivity notice",
        });
      }

      const newNotice = await prisma.inactivityNotice.create({
        data: {
          userId: userIdBigInt,
          workspaceGroupId: workspaceId,
          reason: reason,
          startTime: startDateTime,
          endTime: endDateTime,
          approved: false,
          reviewed: false,
          revoked: false,
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
          id: newNotice.id,
          userId: newNotice.userId,
          username: newNotice.user.username,
          reason: newNotice.reason,
          startTime: newNotice.startTime,
          endTime: newNotice.endTime,
          approved: newNotice.approved,
          reviewed: newNotice.reviewed,
          revoked: newNotice.revoked,
        },
      });
    } catch (error) {
      console.error("Error creating inactivity notice:", error);
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
          error: "Notice not found",
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
        },
      });
    } catch (error) {
      console.error("Error updating notice:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    const { noticeId } = req.body;

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
          error: "Notice not found",
        });
      }

      const revokedNotice = await prisma.inactivityNotice.update({
        where: {
          id: noticeId,
        },
        data: {
          revoked: true,
          reviewed: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Notice revoked successfully",
        data: {
          id: revokedNotice.id,
          revoked: revokedNotice.revoked,
        },
      });
    } catch (error) {
      console.error("Error revoking notice:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }
}
