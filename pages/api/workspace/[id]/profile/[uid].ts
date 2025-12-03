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
          orderBy: {
            isOwnerRole: "desc",
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userRole = user.roles[0];
    if (!userRole) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (
      !userRole.isOwnerRole &&
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
      },
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: { userid: true, username: true },
        },
      },
    });

    const hostedSessions = await prisma.session.findMany({
      where: {
        ownerId: userId,
        sessionType: { workspaceGroupId },
        date: {
          gte: startDate,
          lte: currentDate,
        },
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

    const roleBasedHostedSessions = allSessionParticipations.filter(
      (participation) => {
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
    ).length;

    const roleBasedSessionsHosted =
      ownedSessions.length + roleBasedHostedSessions;
    const ownedSessionIds = new Set(ownedSessions.map((s) => s.id));
    const roleBasedSessionsAttended = allSessionParticipations.filter(
      (participation) => {
        const slots = participation.session.sessionType.slots as any[];
        const slotIndex = participation.slot;
        const slotName = slots[slotIndex]?.name || "";
        const isHosting =
          participation.roleID.toLowerCase().includes("host") ||
          participation.roleID.toLowerCase().includes("co-host") ||
          slotName.toLowerCase().includes("host") ||
          slotName.toLowerCase().includes("co-host");

        return !isHosting && !ownedSessionIds.has(participation.sessionid);
      }
    ).length;

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
        hostedSessions: serializedHostedSessions,
        roleBasedSessionsHosted,
        roleBasedSessionsAttended,
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
