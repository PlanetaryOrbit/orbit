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
  const { page = "1", limit = "10" } = req.query;
  const workspaceGroupId = parseInt(id as string);

  try {
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const periods = await prisma.activityHistory.findMany({
      where: { workspaceGroupId },
      select: {
        periodStart: true,
        periodEnd: true,
      },
      distinct: ["periodEnd"],
      orderBy: { periodEnd: "desc" },
      skip,
      take: limitNum,
    });
    const periodsWithData = await Promise.all(
      periods.map(async (period) => {
        const periodHistory = await prisma.activityHistory.findMany({
          where: {
            workspaceGroupId,
            periodEnd: period.periodEnd,
          },
          include: {
            user: {
              select: {
                userid: true,
                username: true,
                picture: true,
              },
            },
          },
          orderBy: { minutes: "desc" },
        });

        const totalMinutes = periodHistory.reduce(
          (sum, h) => sum + h.minutes,
          0
        );
        const totalMessages = periodHistory.reduce(
          (sum, h) => sum + h.messages,
          0
        );
        const totalUsers = periodHistory.length;
        const avgMinutes =
          totalUsers > 0 ? Math.round(totalMinutes / totalUsers) : 0;

        return {
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          summary: {
            totalMinutes,
            totalMessages,
            totalUsers,
            avgMinutes,
          },
          topPerformers: periodHistory.slice(0, 5).map((h) => ({
            user: h.user,
            minutes: h.minutes,
            messages: h.messages,
            sessionsHosted: h.sessionsHosted,
            sessionsAttended: h.sessionsAttended,
          })),
        };
      })
    );
    const totalPeriods = await prisma.activityHistory.findMany({
      where: { workspaceGroupId },
      select: { periodEnd: true },
      distinct: ["periodEnd"],
    });

    return res.status(200).json({
      success: true,
      data: {
        periods: periodsWithData,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalPeriods.length / limitNum),
          totalPeriods: totalPeriods.length,
        },
      },
    });
  } catch (error) {
    console.error("Activity history fetch error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch activity history" });
  }
});
