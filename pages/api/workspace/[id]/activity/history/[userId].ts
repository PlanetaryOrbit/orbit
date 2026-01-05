import { withPermissionCheck } from "@/utils/permissionsManager";
import { withSessionRoute } from "@/lib/withSession";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

export default withSessionRoute(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const { id, userId } = req.query;
  const { periodEnd } = req.query;
  const workspaceGroupId = parseInt(id as string);
  const targetUserId = BigInt(userId as string);
  const sessionUserId = req.session.userid;

  if (!sessionUserId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const isOwnActivity = BigInt(sessionUserId) === targetUserId;

  if (!isOwnActivity) {
    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(sessionUserId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceGroupId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceGroupId,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const membership = user.workspaceMemberships[0];
    const isAdmin = membership?.isAdmin || false;
    const userRole = user.roles[0];
    if (!userRole) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (
      !isAdmin &&
      !userRole.permissions?.includes("view_member_profiles")
    ) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
  }

  try {
    let whereClause: any = {
      workspaceGroupId,
      userId: targetUserId,
    };
    if (periodEnd) {
      whereClause.periodEnd = new Date(periodEnd as string);
    }

    const userHistory = await prisma.activityHistory.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            userid: true,
            username: true,
            picture: true,
          },
        },
      },
      orderBy: { periodEnd: "desc" },
    });

    userHistory.forEach((record, index) => {
      console.log(`Record ${index + 1}:`, {
        period: `${record.periodStart} - ${record.periodEnd}`,
        minutes: record.minutes,
        messages: record.messages,
        sessionsHosted: record.sessionsHosted,
        sessionsAttended: record.sessionsAttended,
        idleTime: record.idleTime,
        wallPosts: record.wallPosts
      });
    });

    if (userHistory.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No activity history found for this user",
      });
    }

    if (periodEnd) {
      const history = userHistory[0];
      if (!history) {
        return res.status(404).json({
          success: false,
          error: "No activity history found for this period",
        });
      }

      const periodStart = history.periodStart;
      const periodEndDate = history.periodEnd;
      const sessions: any[] = [];
      const adjustments: any[] = [];
      const totalMinutes = history.minutes;

      return res.status(200).json({
        success: true,
        data: JSON.parse(
          JSON.stringify(
            {
              user: history.user,
              period: {
                start: history.periodStart,
                end: history.periodEnd,
              },
              activity: {
                minutes: history.minutes,
                messages: history.messages,
                sessionsHosted: history.sessionsHosted,
                sessionsAttended: history.sessionsAttended,
                idleTime: history.idleTime,
                wallPosts: history.wallPosts || 0,
                quotaProgress: history.quotaProgress,
                totalSessions:
                  history.sessionsHosted + history.sessionsAttended,
              },
              sessions,
              adjustments,
            },
            (key, value) =>
              typeof value === "bigint" ? value.toString() : value
          )
        ),
      });
    }

    if (userHistory.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          user: null,
          history: [],
        },
      });
    }

    const formattedHistory = userHistory.map((h) => ({
      period: {
        start: h.periodStart,
        end: h.periodEnd,
      },
      activity: {
        minutes: h.minutes,
        messages: h.messages,
        sessionsHosted: h.sessionsHosted,
        sessionsAttended: h.sessionsAttended,
        idleTime: h.idleTime,
        wallPosts: h.wallPosts || 0,
        quotaProgress: h.quotaProgress,
        totalSessions: h.sessionsHosted + h.sessionsAttended,
      },
    }));

    return res.status(200).json({
      success: true,
      data: JSON.parse(
        JSON.stringify(
          {
            user: userHistory[0].user,
            history: formattedHistory,
          },
          (key, value) => (typeof value === "bigint" ? value.toString() : value)
        )
      ),
    });
  } catch (error) {
    console.error("User activity history fetch error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch user activity history" });
  }
});
