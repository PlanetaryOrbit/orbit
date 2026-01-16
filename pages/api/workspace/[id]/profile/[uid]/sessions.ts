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

  const { id, uid } = req.query;
  const workspaceGroupId = parseInt(id as string);
  const targetUserId = BigInt(uid as string);
  const sessionUserId = req.session.userid;
  const periodStart = req.query.periodStart as string | undefined;
  const periodEnd = req.query.periodEnd as string | undefined;
  const isHistoricalView = !!(periodStart && periodEnd);

  if (!sessionUserId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const isOwnProfile = BigInt(sessionUserId) === targetUserId;
  if (!isOwnProfile) {
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
    if (!isAdmin && !userRole?.permissions?.includes("view_member_profiles")) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
  }

  try {
    const lastReset = await prisma.activityReset.findFirst({
      where: {
        workspaceGroupId: workspaceGroupId,
      },
      orderBy: {
        resetAt: "desc",
      },
    });

    const nov30 = new Date("2025-11-30T00:00:00Z");
    const startDate = lastReset?.resetAt
      ? lastReset.resetAt > nov30
        ? lastReset.resetAt
        : nov30
      : nov30;

    const currentDate = new Date();

    let sessionQuery: any;

    if (isHistoricalView) {
      const historyStart = new Date(periodStart!);
      const historyEnd = new Date(periodEnd!);

      sessionQuery = {
        ownerId: targetUserId,
        sessionType: {
          workspaceGroupId: workspaceGroupId,
        },
        archived: true,
        archiveStartDate: { lte: historyEnd },
        archiveEndDate: { gte: historyStart },
      };
    } else {
      sessionQuery = {
        ownerId: targetUserId,
        sessionType: {
          workspaceGroupId: workspaceGroupId,
        },
        date: { gte: startDate },
        OR: [{ archived: { not: true } }, { archived: null }],
      };
    }

    const ownedSessions = await prisma.session.findMany({
      where: sessionQuery,
      include: {
        owner: {
          select: {
            userid: true,
            username: true,
            picture: true,
          },
        },
        sessionType: {
          select: {
            id: true,
            name: true,
            slots: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                userid: true,
                username: true,
                picture: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    let participationQuery: any;

    if (isHistoricalView) {
      const historyStart = new Date(periodStart!);
      const historyEnd = new Date(periodEnd!);

      participationQuery = {
        userid: targetUserId,
        session: {
          sessionType: { workspaceGroupId: workspaceGroupId },
        },
        archived: true,
        archiveStartDate: { lte: historyEnd },
        archiveEndDate: { gte: historyStart },
      };
    } else {
      participationQuery = {
        userid: targetUserId,
        session: {
          sessionType: { workspaceGroupId: workspaceGroupId },
          date: { gte: startDate },
        },
        OR: [{ archived: { not: true } }, { archived: null }],
      };
    }

    const participatedSessions = await prisma.sessionUser.findMany({
      where: participationQuery,
      include: {
        session: {
          include: {
            owner: {
              select: {
                userid: true,
                username: true,
                picture: true,
              },
            },
            sessionType: {
              select: {
                id: true,
                name: true,
                slots: true,
              },
            },
            users: {
              include: {
                user: {
                  select: {
                    userid: true,
                    username: true,
                    picture: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const sessionMap = new Map();
    ownedSessions.forEach((session) => {
      sessionMap.set(session.id, session);
    });

    participatedSessions.forEach((participation) => {
      const sess = (participation as any).session;
      if (sess && !sessionMap.has(sess.id)) {
        sessionMap.set(sess.id, sess);
      }
    });

    const allSessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const serializedSessions = allSessions.map((session) => ({
      ...session,
      ownerId: session.ownerId?.toString(),
      owner: session.owner
        ? {
            ...session.owner,
            userid: session.owner.userid.toString(),
          }
        : null,
      users: session.users?.map((u: any) => ({
        ...u,
        userid: u.userid.toString(),
        user: u.user
          ? {
              ...u.user,
              userid: u.user.userid.toString(),
            }
          : null,
      })),
    }));

    return res.status(200).json({
      success: true,
      sessions: serializedSessions,
    });
  } catch (error) {
    console.error("Error fetching session history:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch session history",
    });
  }
});
