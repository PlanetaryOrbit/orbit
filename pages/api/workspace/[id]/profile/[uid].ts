import { withPermissionCheck } from "@/utils/permissionsManager";
import { withSessionRoute } from "@/lib/withSession";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { getThumbnail } from "@/utils/userinfoEngine";

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
  const userId = BigInt(uid as string);
  const sessionUserId = req.session.userid;

  if (!sessionUserId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const isOwnProfile = BigInt(sessionUserId) === userId;

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
    if (!userRole) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (
      !isAdmin &&
      !userRole.permissions?.includes("view_activity")
    ) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
  }

  try {
    const currentDate = new Date();
    const lastReset = await prisma.activityReset.findFirst({
      where: { workspaceGroupId },
      orderBy: { resetAt: "desc" },
    });
    const startDate = lastReset?.resetAt || new Date("2025-01-01");

    const user = await prisma.user.findFirst({
      where: { userid: userId },
      include: {
        roles: {
          where: { workspaceGroupId },
          include: {
            quotaRoles: {
              include: { quota: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const sessions = await prisma.activitySession.findMany({
      where: {
        userId,
        workspaceGroupId,
        startTime: {
          gte: startDate,
          lte: currentDate,
        },
        archived: { not: true },
      },
      include: {
        user: {
          select: { picture: true },
        },
      },
      orderBy: [{ active: "desc" }, { endTime: "desc" }, { startTime: "desc" }],
    });

    const adjustments = await prisma.activityAdjustment.findMany({
      where: {
        userId,
        workspaceGroupId,
        archived: { not: true },
      },
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { userid: true, username: true },
        },
      },
    });

    const notices = await prisma.inactivityNotice.findMany({
      where: {
        userId,
        workspaceGroupId,
      },
      orderBy: { id: "desc" },
    });

    const hostedSessions = await prisma.session.findMany({
      where: {
        ownerId: userId,
        sessionType: { workspaceGroupId },
        date: {
          gte: startDate,
          lte: currentDate,
        },
        archived: { not: true },
      },
      orderBy: { date: "desc" },
    });

    const ownedSessions = await prisma.session.findMany({
      where: {
        ownerId: userId,
        sessionType: { workspaceGroupId },
        date: {
          gte: startDate,
          lte: currentDate,
        },
        archived: { not: true },
      },
    });

    const allSessionParticipations = await prisma.sessionUser.findMany({
      where: {
        userid: userId,
        session: {
          sessionType: { workspaceGroupId },
          date: {
            gte: startDate,
            lte: currentDate,
          },
          archived: { not: true },
        },
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            sessionType: {
              select: {
                slots: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const ownedSessionIds = new Set(ownedSessions.map((s) => s.id));
    const roleBasedHostedParticipations = allSessionParticipations.filter(
      (participation) => {
        if (ownedSessionIds.has(participation.sessionid)) {
          return false;
        }

        const slots = participation.session.sessionType.slots as any[];
        const slotIndex = participation.slot;
        const slotName = slots[slotIndex]?.name || "";
        return (
          participation.roleID.toLowerCase().includes("host") ||
          participation.roleID.toLowerCase().includes("co-host") ||
          slotName.toLowerCase().includes("host") ||
          slotName.toLowerCase().includes("co-host")
        );
      }
    );
    const roleBasedSessionsHosted =
      ownedSessions.length + roleBasedHostedParticipations.length;
    const roleBasedSessionsAttended = allSessionParticipations.filter(
      (participation) => {
        if (ownedSessionIds.has(participation.sessionid)) {
          return false;
        }

        const slots = participation.session.sessionType.slots as any[];
        const slotIndex = participation.slot;
        const slotName = slots[slotIndex]?.name || "";
        const isHosting =
          participation.roleID.toLowerCase().includes("host") ||
          participation.roleID.toLowerCase().includes("co-host") ||
          slotName.toLowerCase().includes("host") ||
          slotName.toLowerCase().includes("co-host");

        return !isHosting;
      }
    ).length;

    const sessionsLogged = {
      all: new Set([
        ...ownedSessions.map(s => s.id),
        ...allSessionParticipations.map(p => p.sessionid)
      ]).size,
      byType: {} as Record<string, number>,
      byRole: {
        host: ownedSessions.length,
        cohost: allSessionParticipations.filter((p) => {
          const slots = p.session.sessionType.slots as any[];
          const slotName = slots[p.slot]?.name || "";
          return p.roleID.toLowerCase().includes("co-host") || slotName.toLowerCase().includes("co-host");
        }).length,
      }
    };

    const allUserSessions = [
      ...ownedSessions.map(s => ({ id: s.id, type: s.type })),
      ...allSessionParticipations.map(p => ({ 
        id: p.sessionid, 
        type: (p.session as any).type 
      }))
    ];
    const uniqueSessionsById = new Map(allUserSessions.map(s => [s.id, s.type]));
    for (const [, sessionType] of uniqueSessionsById) {
      const type = sessionType || 'other';
      sessionsLogged.byType[type] = (sessionsLogged.byType[type] || 0) + 1;
    }

    const allianceVisits = await prisma.allyVisit.findMany({
      where: {
        ally: {
          workspaceGroupId: workspaceGroupId,
        },
        time: {
          gte: startDate,
          lte: currentDate,
        },
        OR: [
          { hostId: userId },
          { participants: { has: userId } }
        ]
      },
      include: {
        ally: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    const allianceVisitsCount = allianceVisits.length;

    const avatar = getThumbnail(user.userid);

    const quotas = user.roles
      .flatMap((role) => role.quotaRoles)
      .map((qr) => qr.quota);

    const serializedSessions = sessions.map((session) => ({
      ...session,
      userId: session.userId.toString(),
      universeId: session.universeId?.toString() || null,
      idleTime: session.idleTime?.toString() || null,
    }));

    const serializedAdjustments = adjustments.map((adjustment) => ({
      ...adjustment,
      userId: adjustment.userId.toString(),
      actorId: adjustment.actorId.toString(),
      actor: adjustment.actor
        ? {
            ...adjustment.actor,
            userid: adjustment.actor.userid.toString(),
          }
        : null,
    }));

    const serializedHostedSessions = hostedSessions.map((session) => ({
      ...session,
      ownerId: session.ownerId?.toString() || null,
    }));

    const serializedNotices = notices.map((notice) => ({
      ...notice,
      userId: notice.userId.toString(),
    }));

    return res.status(200).json({
      success: true,
      data: {
        user: {
          userid: user.userid.toString(),
          username: user.username,
          picture: user.picture,
        },
        sessions: serializedSessions,
        adjustments: serializedAdjustments,
        notices: serializedNotices,
        hostedSessions: serializedHostedSessions,
        roleBasedSessionsHosted,
        roleBasedSessionsAttended,
        sessionsLogged,
        allianceVisitsCount,
        quotas,
        avatar,
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch profile data" });
  }
});
