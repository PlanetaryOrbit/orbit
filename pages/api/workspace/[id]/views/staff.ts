import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";
import { getThumbnail } from "@/utils/userinfoEngine";
import noblox from "noblox.js";

export default withPermissionCheck(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const workspaceGroupId = parseInt(req.query.id as string);
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const skip = page * pageSize;

    try {
      const lastReset = await prisma.activityReset.findFirst({
        where: {
          workspaceGroupId,
        },
        orderBy: {
          resetAt: "desc",
        },
      });

      const startDate = lastReset?.resetAt || new Date("2025-01-01");
      const currentDate = new Date();

      const activityConfig = await getConfig("activity", workspaceGroupId);
      const idleTimeEnabled = activityConfig?.idleTimeEnabled ?? true;
      const totalUsers = await prisma.user.count({
        where: {
          roles: {
            some: {
              workspaceGroupId,
            },
          },
        },
      });

      const allUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              workspaceGroupId,
            },
          },
        },
        include: {
          book: true,
          wallPosts: true,
          inactivityNotices: true,
          sessions: true,
          ranks: true,
          roles: {
            where: {
              workspaceGroupId,
            },
            include: {
              quotaRoles: {
                include: {
                  quota: true,
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
      });

      const allActivity = await prisma.activitySession.findMany({
        where: {
          workspaceGroupId,
          startTime: {
            gte: startDate,
            lte: currentDate,
          },
          userId: {
            in: allUsers.map((u) => u.userid),
          },
        },
        include: {
          user: {
            include: {
              writtenBooks: true,
              wallPosts: true,
              inactivityNotices: true,
              sessions: true,
              ranks: true,
            },
          },
        },
      });

      const computedUsers: any[] = [];

      for (const user of allUsers) {
        const ms: number[] = [];
        allActivity
          .filter((x) => BigInt(x.userId) == user.userid && !x.active)
          .forEach((session) => {
            const sessionDuration =
              (session.endTime?.getTime() as number) -
              session.startTime.getTime();
            const idleTimeMs =
              idleTimeEnabled && session.idleTime
                ? Number(session.idleTime) * 60000
                : 0;
            ms.push(sessionDuration - idleTimeMs);
          });

        const ims: number[] = [];
        if (idleTimeEnabled) {
          allActivity
            .filter((x: any) => BigInt(x.userId) == user.userid)
            .forEach((s: any) => {
              ims.push(Number(s.idleTime));
            });
        }

        const messages: number[] = [];
        allActivity
          .filter((x: any) => BigInt(x.userId) == user.userid)
          .forEach((s: any) => {
            messages.push(s.messages);
          });

        const userId = user.userid;
        const userAdjustments = await prisma.activityAdjustment.findMany({
          where: {
            userId: user.userid,
            workspaceGroupId,
            createdAt: {
              gte: startDate,
              lte: currentDate,
            },
          },
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
              participation.roleID.toLowerCase().includes("co-host") ||
              slotName.toLowerCase().includes("co-host")
            );
          }
        ).length;

        const sessionsHosted = ownedSessions.length + roleBasedHostedSessions;

        const ownedSessionIds = new Set(ownedSessions.map((s) => s.id));
        const sessionsAttended = allSessionParticipations.filter(
          (participation) => {
            const slots = participation.session.sessionType.slots as any[];
            const slotIndex = participation.slot;
            const slotName = slots[slotIndex]?.name || "";
            const isCoHost =
              participation.roleID.toLowerCase().includes("co-host") ||
              slotName.toLowerCase().includes("co-host");
            return !isCoHost && !ownedSessionIds.has(participation.sessionid);
          }
        ).length;

        const allUserSessionsIds = new Set([
          ...ownedSessions.map((s) => s.id),
          ...allSessionParticipations.map((p) => p.sessionid),
        ]);
        const sessionsLogged = allUserSessionsIds.size;

        const sessionsByType: Record<string, number> = {};
        const allUserSessions = [
          ...ownedSessions.map((s) => ({ id: s.id, type: s.type })),
          ...allSessionParticipations.map((p) => ({
            id: p.sessionid,
            type: (p.session as any).type,
          })),
        ];
        const uniqueSessionsMap = new Map(
          allUserSessions.map((s) => [s.id, s.type])
        );
        for (const [, sessionType] of uniqueSessionsMap) {
          const type = sessionType || "other";
          sessionsByType[type] = (sessionsByType[type] || 0) + 1;
        }

        const allianceVisits = await prisma.allyVisit.count({
          where: {
            ally: {
              workspaceGroupId: workspaceGroupId,
            },
            time: {
              gte: startDate,
              lte: currentDate,
            },
            OR: [{ hostId: userId }, { participants: { has: userId } }],
          },
        });

        const currentWallPosts = await prisma.wallPost.findMany({
          where: {
            authorId: userId,
            workspaceGroupId,
            createdAt: {
              gte: startDate,
              lte: currentDate,
            },
          },
        });

        const userQuotas = user.roles
          .flatMap((role) => role.quotaRoles)
          .map((qr) => qr.quota);

        let quota = true;
        if (userQuotas.length > 0) {
          for (const userQuota of userQuotas) {
            let currentValue = 0;

            switch (userQuota.type) {
              case "mins":
                const totalAdjustmentMinutes = userAdjustments.reduce(
                  (sum, adj) => sum + adj.minutes,
                  0
                );
                const totalActiveMinutes = ms.length
                  ? Math.round(ms.reduce((p, c) => p + c) / 60000)
                  : 0;
                currentValue = totalActiveMinutes + totalAdjustmentMinutes;
                break;
              case "sessions_hosted":
                if (userQuota.sessionType && userQuota.sessionType !== "all") {
                  currentValue = sessionsByType[userQuota.sessionType] || 0;
                } else {
                  currentValue = sessionsHosted;
                }
                break;
              case "sessions_attended":
                currentValue = sessionsAttended;
                break;
              case "sessions_logged":
                if (userQuota.sessionType && userQuota.sessionType !== "all") {
                  currentValue = sessionsByType[userQuota.sessionType] || 0;
                } else {
                  currentValue = sessionsLogged;
                }
                break;
              case "alliance_visits":
                currentValue = allianceVisits;
                break;
            }

            if (currentValue < userQuota.value) {
              quota = false;
              break;
            }
          }
        } else {
          quota = false;
        }

        const totalAdjustmentMs = userAdjustments.reduce(
          (sum, adj) => sum + adj.minutes * 60000,
          0
        );

        const totalActiveMs =
          (ms.length ? ms.reduce((p, c) => p + c) : 0) + totalAdjustmentMs;

        computedUsers.push({
          info: {
            userId: Number(user.userid),
            picture: getThumbnail(user.userid),
            username: user.username,
          },
          book: user.book,
          wallPosts: currentWallPosts,
          inactivityNotices: user.inactivityNotices,
          sessions: allSessionParticipations,
          rankID: user.ranks[0]?.rankId ? Number(user.ranks[0]?.rankId) : 0,
          minutes: Math.round(totalActiveMs / 60000),
          idleMinutes: ims.length
            ? Math.round(ims.reduce((p, c) => p + c))
            : 0,
          hostedSessions: { length: sessionsHosted },
          sessionsAttended: sessionsAttended,
          allianceVisits: allianceVisits,
          messages: messages.length
            ? Math.round(messages.reduce((p, c) => p + c))
            : 0,
          registered: user.registered || false,
          quota: quota,
        });
      }

      const ranks = await noblox.getRoles(workspaceGroupId);

      const serializedUsers = JSON.parse(
        JSON.stringify(computedUsers, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      return res.status(200).json({
        users: serializedUsers,
        ranks,
        pagination: {
          page,
          pageSize,
          totalUsers,
          totalPages: Math.ceil(totalUsers / pageSize),
        },
      });
    } catch (error) {
      console.error("Error fetching staff data:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
  "view_members"
);
