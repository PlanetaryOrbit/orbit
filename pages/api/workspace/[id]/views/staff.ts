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

    let filters: any[] = [];
    if (req.query.filters && typeof req.query.filters === "string") {
      try {
        filters = JSON.parse(req.query.filters);
      } catch (e) {
        console.error("Failed to parse filters:", e);
      }
    }

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
      const whereClause: any = {
        roles: {
          some: {
            workspaceGroupId,
          },
        },
      };

      const usernameFilters = filters.filter((f) => f.column === "username");
      if (usernameFilters.length > 0) {
        const usernameConditions = usernameFilters.map((filter) => {
          if (filter.filter === "equal") {
            return { username: filter.value };
          } else if (filter.filter === "notEqual") {
            return { username: { not: filter.value } };
          } else if (filter.filter === "contains") {
            return { username: { contains: filter.value, mode: "insensitive" } };
          }
          return {};
        });
        
        if (usernameConditions.length > 0) {
          whereClause.AND = usernameConditions;
        }
      }

      // Fetch all users matching database-level filters (username)
      // We'll apply pagination after computing and filtering
      const allUsers = await prisma.user.findMany({
        where: whereClause,
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
      
      // Apply post-computation filters (for computed fields like minutes, rank, etc.)
      let filteredUsers = computedUsers;
      
      for (const filter of filters) {
        if (filter.column === "username") {
          // Already handled in database query
          continue;
        }

        filteredUsers = filteredUsers.filter((user) => {
          let value: any;
          
          switch (filter.column) {
            case "minutes":
              value = user.minutes;
              break;
            case "idle":
              value = user.idleMinutes;
              break;
            case "rank":
              value = user.rankID;
              break;
            case "sessions":
              value = user.sessions.length;
              break;
            case "hosted":
              value = user.hostedSessions.length;
              break;
            case "warnings":
              value = Array.isArray(user.book)
                ? user.book.filter((b: any) => b.type === "warning").length
                : 0;
              break;
            case "messages":
              value = user.messages;
              break;
            case "notices":
              value = user.inactivityNotices.length;
              break;
            case "registered":
              value = user.registered;
              break;
            case "quota":
              value = user.quota;
              break;
            default:
              return true;
          }

          // Apply filter operation
          switch (filter.filter) {
            case "equal":
              if (typeof value === "boolean") {
                return value === (filter.value === "true");
              }
              return value == filter.value;
            case "notEqual":
              if (typeof value === "boolean") {
                return value !== (filter.value === "true");
              }
              return value != filter.value;
            case "greaterThan":
              return value > parseFloat(filter.value);
            case "lessThan":
              return value < parseFloat(filter.value);
            case "contains":
              return String(value).toLowerCase().includes(filter.value.toLowerCase());
            default:
              return true;
          }
        });
      }

      // Apply pagination after filtering
      const totalFilteredUsers = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(
        page * pageSize,
        (page + 1) * pageSize
      );

      const serializedUsers = JSON.parse(
        JSON.stringify(paginatedUsers, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      return res.status(200).json({
        users: serializedUsers,
        ranks,
        pagination: {
          page,
          pageSize,
          totalUsers: totalFilteredUsers,
          totalPages: Math.ceil(totalFilteredUsers / pageSize),
        },
      });
    } catch (error) {
      console.error("Error fetching staff data:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
  "view_members"
);
