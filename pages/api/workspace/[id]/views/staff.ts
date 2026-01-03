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

      const computedFilters = filters.filter(
        (f) => !["username"].includes(f.column)
      );
      const needsFullComputation = computedFilters.length > 0;

      let allUsers: any[] = [];
      let paginatedUsers: any[] = [];
      let totalFilteredUsers = 0;

      if (needsFullComputation) {
        allUsers = await prisma.user.findMany({
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
      } else {
        const totalCount = await prisma.user.count({
          where: whereClause,
        });
        totalFilteredUsers = totalCount;

        allUsers = await prisma.user.findMany({
          where: whereClause,
          skip: page * pageSize,
          take: pageSize,
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
      }

      const userIdsToProcess = allUsers.map((u) => u.userid);
      const allActivity = await prisma.activitySession.findMany({
        where: {
          workspaceGroupId,
          startTime: {
            gte: startDate,
            lte: currentDate,
          },
          userId: {
            in: userIdsToProcess,
          },
        },
        select: {
          userId: true,
          startTime: true,
          endTime: true,
          active: true,
          idleTime: true,
          messages: true,
        },
      });

      const userIds = allUsers.map(u => u.userid);
      
      const [allAdjustments, allOwnedSessions, allParticipations, allAllyVisits, allCurrentWallPosts] = await Promise.all([
        prisma.activityAdjustment.findMany({
          where: {
            userId: { in: userIds },
            workspaceGroupId,
            createdAt: {
              gte: startDate,
              lte: currentDate,
            },
          },
        }),
        prisma.session.findMany({
          where: {
            ownerId: { in: userIds },
            sessionType: { workspaceGroupId },
            date: {
              gte: startDate,
              lte: currentDate,
            },
          },
        }),
        prisma.sessionUser.findMany({
          where: {
            userid: { in: userIds },
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
        }),
        prisma.allyVisit.findMany({
          where: {
            ally: {
              workspaceGroupId: workspaceGroupId,
            },
            time: {
              gte: startDate,
              lte: currentDate,
            },
            OR: [
              { hostId: { in: userIds } },
              { participants: { hasSome: userIds.map(id => id.toString()) } },
            ],
          },
          select: {
            hostId: true,
            participants: true,
          },
        }),
        prisma.wallPost.findMany({
          where: {
            authorId: { in: userIds },
            workspaceGroupId,
            createdAt: {
              gte: startDate,
              lte: currentDate,
            },
          },
        }),
      ]);

      const adjustmentsByUser = new Map<string, any[]>();
      allAdjustments.forEach(adj => {
        const key = adj.userId.toString();
        if (!adjustmentsByUser.has(key)) adjustmentsByUser.set(key, []);
        adjustmentsByUser.get(key)!.push(adj);
      });

      const ownedSessionsByUser = new Map<string, any[]>();
      allOwnedSessions.forEach(sess => {
        if (!sess.ownerId) return;
        const key = sess.ownerId.toString();
        if (!ownedSessionsByUser.has(key)) ownedSessionsByUser.set(key, []);
        ownedSessionsByUser.get(key)!.push(sess);
      });

      const participationsByUser = new Map<string, any[]>();
      allParticipations.forEach(part => {
        const key = part.userid.toString();
        if (!participationsByUser.has(key)) participationsByUser.set(key, []);
        participationsByUser.get(key)!.push(part);
      });

      const wallPostsByUser = new Map<string, any[]>();
      allCurrentWallPosts.forEach(post => {
        const key = post.authorId.toString();
        if (!wallPostsByUser.has(key)) wallPostsByUser.set(key, []);
        wallPostsByUser.get(key)!.push(post);
      });

      const computedUsers: any[] = [];

      for (const user of allUsers) {
        const userId = user.userid;
        const userKey = userId.toString();
        const ms: number[] = [];
        allActivity
          .filter((x) => BigInt(x.userId) == userId && !x.active)
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
            .filter((x: any) => BigInt(x.userId) == userId)
            .forEach((s: any) => {
              ims.push(Number(s.idleTime));
            });
        }

        const messages: number[] = [];
        allActivity
          .filter((x: any) => BigInt(x.userId) == userId)
          .forEach((s: any) => {
            messages.push(s.messages);
          });

        const userAdjustments = adjustmentsByUser.get(userKey) || [];
        const ownedSessions = ownedSessionsByUser.get(userKey) || [];
        const allSessionParticipations = participationsByUser.get(userKey) || [];

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
          ...ownedSessions.map((s) => ({ id: s.id, type: s.type || "other" })),
          ...allSessionParticipations.map((p) => ({
            id: p.sessionid,
            type: "other",
          })),
        ];
        const uniqueSessionsMap = new Map(
          allUserSessions.map((s) => [s.id, s.type])
        );
        for (const [, sessionType] of uniqueSessionsMap) {
          const type = sessionType || "other";
          sessionsByType[type] = (sessionsByType[type] || 0) + 1;
        }

        const userIdStr = userId.toString();
        const allianceVisits = allAllyVisits.filter(
          visit => visit.hostId.toString() === userIdStr || visit.participants.includes(userIdStr)
        ).length;

        const currentWallPosts = wallPostsByUser.get(userKey) || [];

        const userQuotas = user.roles
          .flatMap((role: any) => role.quotaRoles)
          .map((qr: any) => qr.quota);

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
      
      if (needsFullComputation) {
        for (const filter of computedFilters) {
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
        totalFilteredUsers = filteredUsers.length;
        paginatedUsers = filteredUsers.slice(
          page * pageSize,
          (page + 1) * pageSize
        );
      } else {
        paginatedUsers = filteredUsers;
      }

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
