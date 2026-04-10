import prisma from "./database";
import type {
  NextApiRequest,
  NextApiResponse,
  NextApiHandler,
  GetServerSidePropsContext,
} from "next";
import { withSessionRoute, withSessionSsr } from "@/lib/withSession";
import * as noblox from "noblox.js";
import { getConfig } from "./configEngine";
import { validateCsrf } from "./csrf";
import { getThumbnail } from "./userinfoEngine";
import { getRobloxUserInfo, getUsersWithinAGroupRoleset } from './roblox'

const permissionsCache = new Map<string, { data: any; timestamp: number }>();
const PERMISSIONS_CACHE_DURATION = 120000;

interface GroupCache {
  userRoleMap: Map<number, { robloxRoleId: number; username: string }>;
  builtAt: Date;
}

const groupCacheStore = new Map<number, GroupCache>();

type MiddlewareData = {
  handler: NextApiHandler;
  next: any;
  permissions: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function removeRoleFromUser(userid: bigint, roleId: string) {
  await prisma.user
    .update({
      where: { userid },
      data: { roles: { disconnect: { id: roleId } } },
    })
    .catch((err: any) =>
      console.error(
        `[update-group] Disconnect role ${roleId} from ${userid} failed:`,
        err
      )
    );
  await prisma.roleMember
    .deleteMany({ where: { roleId, userId: userid } })
    .catch((err: any) =>
      console.error(
        `[update-group] Delete RoleMember ${roleId}/${userid} failed:`,
        err
      )
    );
}

async function retryNobloxRequest<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  initialDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = initialDelay * Math.pow(2, attempt - 1);
        console.log(
          `[retryNobloxRequest] Retrying after ${delayMs}ms (attempt ${attempt + 1
          }/${maxRetries})`
        );
        await delay(delayMs);
      }

      return await fn();
    } catch (error: any) {
      lastError = error;
      // prevent rate limited requests from failing immediately (hopefully)
      const isRateLimitError =
        error?.statusCode === 429 ||
        error?.statusCode === 401 ||
        (error?.message &&
          error.message.toLowerCase().includes("too many requests"));

      if (isRateLimitError && attempt < maxRetries - 1) {
        console.log(
          `[retryNobloxRequest] Rate limit hit, will retry (attempt ${attempt + 1
          }/${maxRetries})`
        );
        continue;
      }

      if (!isRateLimitError || attempt === maxRetries - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function buildGroupCache(
  groupID: number,
  ranks: noblox.Role[],
  batchSize = 5
): Promise<Map<number, { robloxRoleId: number; username: string }>> {
  const internalMap = new Map<number,
    { robloxRoleId: number; username: string; _rank: number }
  >();
  const trackedRanks = ranks.filter((r) => r.rank !== 0);

  const apiKey = await getConfig("roblox_opencloud", groupID)

  console.log(
    `[update-group] Building cache: fetching ${trackedRanks.length} ranks in batches of ${batchSize}...`
  );

  for (let i = 0; i < trackedRanks.length; i += batchSize) {
    const batch = trackedRanks.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (rank) => {
        await delay(200);
        console.log(`[update-group] Fetching roleset id=${rank.id} rank=${rank.rank} name=${rank.name}`);
        const result = await getUsersWithinAGroupRoleset(groupID, rank.id, apiKey.key) as any;
        if (!result.success) {
          console.log(result.response)
          throw new Error(`Failed to fetch roleset ${rank.id}: ${result.message}`)
        };
        return { rank, members: result.data };
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`[update-group] Batch fetch failed:`, result.reason);
        continue;
      }
      const { rank, members } = result.value;
      console.log(
        `[update-group] Rank "${rank.name}" (id: ${rank.id}, rank: ${rank.rank}): ${members.length} members`
      );
      for (const member of members) {
        const userId = Number(member.user?.split("/")[1]);
        if (!userId) continue;

        const existing = internalMap.get(userId);
        if (!existing || rank.rank > existing._rank) {
          internalMap.set(userId, {
            robloxRoleId: rank.id,
            username: "",
            _rank: rank.rank,
          });
        }
      }
    }

    console.log(
      `[update-group] Cache progress: ${Math.min(
        i + batchSize,
        trackedRanks.length
      )}/${trackedRanks.length} ranks processed`
    );
  }

  const userIds = Array.from(internalMap.keys());
  console.log(`[update-group] Fetching usernames for ${userIds.length} users...`);

  const usernameBatchSize = 50;
  for (let i = 0; i < userIds.length; i += usernameBatchSize) {
    const batch = userIds.slice(i, i + usernameBatchSize);

    await Promise.allSettled(
      batch.map(async (userId) => {
        const entry = internalMap.get(userId);
        if (!entry) return;
        try {
          const info = await getRobloxUserInfo(userId, apiKey.key);
          internalMap.set(userId, { ...entry, username: info.username });
        } catch {
          internalMap.set(userId, { ...entry, username: "" });
        }
      })
    );

    console.log(`[update-group] Usernames fetched: ${Math.min(i + usernameBatchSize, userIds.length)}/${userIds.length}`);
  }

  const userRoleMap = new Map<number, { robloxRoleId: number; username: string }>();
  for (const [userId, { robloxRoleId, username }] of internalMap) {
    userRoleMap.set(userId, { robloxRoleId, username });
  }

  groupCacheStore.set(groupID, { userRoleMap, builtAt: new Date() });
  console.log(
    `[update-group] Cache built: ${userRoleMap.size} unique users for group ${groupID}`
  );
  return userRoleMap;
}

export function withPermissionCheck(
  handler: NextApiHandler,
  permission?: string | string[]
) {
  return withSessionRoute(async (req: NextApiRequest, res: NextApiResponse) => {
    if (!validateCsrf(req, res)) {
      return res.status(403).json({
        success: false,
        error: "CSRF validation failed. Invalid origin or referer.",
      });
    }

    const uid = req.session.userid;
    const PLANETARY_CLOUD_URL = process.env.PLANETARY_CLOUD_URL;
    const PLANETARY_CLOUD_SERVICE_KEY = process.env.PLANETARY_CLOUD_SERVICE_KEY;
    if (
      PLANETARY_CLOUD_URL !== undefined &&
      PLANETARY_CLOUD_SERVICE_KEY !== undefined &&
      PLANETARY_CLOUD_SERVICE_KEY.length > 0
    ) {
      if (
        req.headers["x-planetary-cloud-service-key"] ===
        PLANETARY_CLOUD_SERVICE_KEY
      ) {
        return handler(req, res);
      }
    }

    if (!uid)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!req.query.id)
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    const workspaceId = parseInt(req.query.id as string);
    const cacheKey = `permissions_${uid}_${workspaceId}`;
    const now = Date.now();
    const cached = permissionsCache.get(cacheKey);
    if (cached && now - cached.timestamp < PERMISSIONS_CACHE_DURATION) {
      const cachedData = cached.data;
      if (cachedData.isAdmin) return handler(req, res);
      if (!permission) return handler(req, res);
      const permissions = Array.isArray(permission) ? permission : [permission];
      const hasPermission = permissions.some((perm) =>
        cachedData.permissions?.includes(perm)
      );
      if (hasPermission) return handler(req, res);
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(uid),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
      },
    });
    if (!user)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    let membership = user.workspaceMemberships[0];
    if (!membership && user.roles.length > 0) {
      try {
        membership = await prisma.workspaceMember.create({
          data: {
            workspaceGroupId: workspaceId,
            userId: Number(uid),
            joinDate: new Date(),
            timezone: "UTC",
          },
        });
      } catch (e) {
        const existingMembership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceGroupId_userId: {
              workspaceGroupId: workspaceId,
              userId: Number(uid),
            },
          },
        });
        if (existingMembership) membership = existingMembership;
      }
    }

    if (!membership)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const isAdmin = membership?.isAdmin || false;
    const userrole = user.roles[0];

    permissionsCache.set(cacheKey, {
      data: { permissions: userrole?.permissions || [], isAdmin },
      timestamp: now,
    });

    if (isAdmin) return handler(req, res);
    if (!permission) return handler(req, res);
    if (!userrole && !isAdmin)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasPermission = permissions.some((perm) =>
      userrole?.permissions?.includes(perm)
    );
    if (hasPermission) return handler(req, res);
    return res.status(401).json({ success: false, error: "Unauthorized" });
  });
}

export function withPermissionCheckSsr(
  handler: (context: GetServerSidePropsContext) => Promise<any>,
  permission?: string | string[]
) {
  return withSessionSsr(async (context) => {
    const { req, res, query } = context;
    const uid = req.session.userid;
    const PLANETARY_CLOUD_URL = process.env.PLANETARY_CLOUD_URL;
    const PLANETARY_CLOUD_SERVICE_KEY = process.env.PLANETARY_CLOUD_SERVICE_KEY;
    if (
      PLANETARY_CLOUD_URL !== undefined &&
      PLANETARY_CLOUD_SERVICE_KEY !== undefined &&
      PLANETARY_CLOUD_SERVICE_KEY.length > 0
    ) {
      if (
        req.headers["x-planetary-cloud-service-key"] ===
        PLANETARY_CLOUD_SERVICE_KEY
      ) {
        return handler(context);
      }
    }

    if (!uid)
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    if (!query.id)
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    const workspaceId = parseInt(query.id as string);
    const cacheKey = `permissions_${uid}_${workspaceId}`;
    const now = Date.now();
    const cached = permissionsCache.get(cacheKey);
    if (cached && now - cached.timestamp < PERMISSIONS_CACHE_DURATION) {
      const cachedData = cached.data;
      if (cachedData.isAdmin) return handler(context);
      if (!permission) return handler(context);
      const permissions = Array.isArray(permission) ? permission : [permission];
      const hasPermission = permissions.some((perm) =>
        cachedData.permissions?.includes(perm)
      );
      if (hasPermission) return handler(context);
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(uid),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
      },
    });

    if (!user) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    let membership = user.workspaceMemberships[0];
    if (!membership && user.roles.length > 0) {
      try {
        membership = await prisma.workspaceMember.create({
          data: {
            workspaceGroupId: workspaceId,
            userId: Number(uid),
            joinDate: new Date(),
            timezone: "UTC",
          },
        });
      } catch (e) {
        const existingMembership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceGroupId_userId: {
              workspaceGroupId: workspaceId,
              userId: Number(uid),
            },
          },
        });
        if (existingMembership) membership = existingMembership;
      }
    }

    if (!membership) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    const isAdmin = membership.isAdmin || false;
    const userrole = user.roles[0];

    permissionsCache.set(cacheKey, {
      data: { permissions: userrole?.permissions || [], isAdmin },
      timestamp: now,
    });
    if (isAdmin) return handler(context);
    if (!permission) return handler(context);

    if (!userrole) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasPermission = user.roles.some((role) =>
      permissions.some((perm) => role.permissions.includes(perm))
    );

    if (!hasPermission) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    return handler(context);
  });
}

export async function checkGroupRoles(groupID: number) {
  try {
    console.log(`[update-group] Starting sync for group ${groupID}`);

    try {
      const [logo, group] = await Promise.all([
        noblox.getLogo(groupID).catch(() => null),
        noblox.getGroup(groupID).catch(() => null),
      ]);
      if (logo || group) {
        await prisma.workspace.update({
          where: { groupId: groupID },
          data: {
            ...(group && { groupName: group.name }),
            ...(logo && { groupLogo: logo }),
            lastSynced: new Date(),
          },
        });
        console.log(`[update-group] Updated group info cache for ${groupID}`);
      }
    } catch (err) {
      console.error(`[update-group] Failed to update group info cache:`, err);
    }

    try {
      const ownerRoles = await prisma.role.findMany({
        where: { workspaceGroupId: groupID, isOwnerRole: true },
        include: { members: true },
      });

      for (const ownerRole of ownerRoles) {
        console.log(
          `[update-group] Migrating ${ownerRole.members.length} users from owner role ${ownerRole.id}`
        );

        let availableRoles = await prisma.role.findMany({
          where: { workspaceGroupId: groupID, id: { not: ownerRole.id } },
        });

        if (availableRoles.length === 0) {
          const fallback = await prisma.role.create({
            data: {
              workspaceGroupId: groupID,
              name: "Default",
              permissions: [],
              groupRoles: [],
              isOwnerRole: false,
            },
          });
          availableRoles = [fallback];
          console.log(
            `[update-group] Created default fallback role for group ${groupID}`
          );
        }

        await Promise.allSettled(
          ownerRole.members.map((member) =>
            prisma.workspaceMember.upsert({
              where: {
                workspaceGroupId_userId: {
                  workspaceGroupId: groupID,
                  userId: member.userid,
                },
              },
              update: { isAdmin: true },
              create: {
                workspaceGroupId: groupID,
                userId: member.userid,
                joinDate: new Date(),
                isAdmin: true,
              },
            })
          )
        );

        for (const member of ownerRole.members) {
          let targetRole = availableRoles[0];

          const userRank = await prisma.rank
            .findFirst({
              where: { userId: member.userid, workspaceGroupId: groupID },
            })
            .catch(() => null);

          if (userRank) {
            const rankId = Number(userRank.rankId);
            const matched = await retryNobloxRequest(() =>
              noblox.getRole(groupID, rankId)
            )
              .then((info) =>
                availableRoles.find((r) =>
                  (r.groupRoles ?? []).map(Number).includes(info.id)
                )
              )
              .catch(() => null);
            if (matched) targetRole = matched;
          }

          await prisma.user
            .update({
              where: { userid: member.userid },
              data: {
                roles: {
                  disconnect: { id: ownerRole.id },
                  connect: { id: targetRole.id },
                },
              },
            })
            .catch((err) =>
              console.error(
                `[update-group] Role swap failed for ${member.userid}:`,
                err
              )
            );
        }

        await prisma.role
          .delete({ where: { id: ownerRole.id } })
          .catch((err) =>
            console.error(
              `[update-group] Failed to delete owner role ${ownerRole.id}:`,
              err
            )
          );
      }

      if (ownerRoles.length > 0) {
        console.log(
          `[update-group] Migrated ${ownerRoles.length} owner roles to isAdmin for group ${groupID}`
        );
      }
    } catch (err) {
      console.error(`[update-group] Failed to migrate owner roles:`, err);
    }

    const rss = await retryNobloxRequest(() => noblox.getRoles(groupID)).catch(
      (err) => {
        console.error(`[update-group] Failed to get Roblox roles:`, err);
        return null;
      }
    );
    if (!rss) {
      console.log(
        `[update-group] No roles found for group ${groupID}, aborting.`
      );
      return;
    }

    const [rs, config] = await Promise.all([
      prisma.role
        .findMany({ where: { workspaceGroupId: groupID } })
        .catch((err) => {
          console.error(`[update-group] Failed to fetch workspace roles:`, err);
          return [] as Awaited<ReturnType<typeof prisma.role.findMany>>;
        }),
      getConfig("activity", groupID).catch(() => null),
    ]);

    const minTrackedRole = config?.role ?? 0;
    const trackedRanks = rss.filter((r) => r.rank >= minTrackedRole);

    console.log(
      `[update-group] Processing ${trackedRanks.length} tracked ranks for group ${groupID}`
    );

    groupCacheStore.delete(groupID);
    const userRoleMap = await buildGroupCache(groupID, trackedRanks);

    const [usersWithRoles, allRoleMembers] = await Promise.all([
      prisma.user.findMany({
        where: { roles: { some: { workspaceGroupId: groupID } } },
        include: {
          roles: { where: { workspaceGroupId: groupID } },
          ranks: { where: { workspaceGroupId: groupID } },
          workspaceMemberships: { where: { workspaceGroupId: groupID } },
        },
      }),
      prisma.roleMember.findMany({
        where: { role: { workspaceGroupId: groupID } },
      }),
    ]);

    const roleMemberIndex = new Map<
      string,
      (typeof allRoleMembers)[number]
    >();
    for (const rm of allRoleMembers) {
      roleMemberIndex.set(`${rm.roleId}:${rm.userId}`, rm);
    }

    const usersInDbIndex = new Map(
      usersWithRoles.map((u) => [Number(u.userid), u])
    );

    console.log(
      `[update-group] Loaded ${usersWithRoles.length} users and ${allRoleMembers.length} role memberships from DB`
    );

    for (const [userId, { robloxRoleId, username }] of userRoleMap.entries()) {
      try {
        const workspaceRole = rs.find((r) =>
          (r.groupRoles ?? []).map(Number).includes(robloxRoleId)
        ); if (!workspaceRole || workspaceRole.isOwnerRole) continue;

        const userInDb = usersInDbIndex.get(userId);
        const hasRole = userInDb?.roles.some((r) => r.id === workspaceRole.id);

        if (hasRole) {
          await prisma.user
            .update({
              where: { userid: BigInt(userId) },
              data: { username },
            })
            .catch((err) =>
              console.error(
                `[update-group] Username update failed for ${userId}:`,
                err
              )
            );
        } else {
          console.log(
            `[update-group] Adding role "${workspaceRole.name}" to user ${userId} (RID: ${robloxRoleId})`
          );

          await prisma.user
            .upsert({
              where: { userid: BigInt(userId) },
              create: {
                userid: BigInt(userId),
                username,
                picture: getThumbnail(userId),
                roles: { connect: { id: workspaceRole.id } },
              },
              update: {
                username,
                roles: { connect: { id: workspaceRole.id } },
              },
            })
            .catch((err) =>
              console.error(
                `[update-group] Upsert failed for ${userId}:`,
                err
              )
            );

          await prisma.roleMember
            .upsert({
              where: {
                roleId_userId: {
                  roleId: workspaceRole.id,
                  userId: BigInt(userId),
                },
              },
              update: {},
              create: {
                roleId: workspaceRole.id,
                userId: BigInt(userId),
                manuallyAdded: false,
              },
            })
            .catch((err) =>
              console.error(
                `[update-group] RoleMember upsert failed for ${userId}:`,
                err
              )
            );
        }

        await prisma.rank
          .upsert({
            where: {
              userId_workspaceGroupId: {
                userId: BigInt(userId),
                workspaceGroupId: groupID,
              },
            },
            update: { rankId: BigInt(robloxRoleId) },
            create: {
              userId: BigInt(userId),
              workspaceGroupId: groupID,
              rankId: BigInt(robloxRoleId),
            },
          })
          .catch((err) =>
            console.error(
              `[update-group] Rank upsert failed for ${userId}:`,
              err
            )
          );
      } catch (err) {
        console.error(`[update-group] Error processing user ${userId}:`, err);
      }
    }

    console.log(`[update-group] Starting role cleanup for group ${groupID}`);

    for (const user of usersWithRoles) {
      const membership = user.workspaceMemberships[0];
      if (membership?.isAdmin) {
        console.log(`[update-group] Skipping admin ${user.userid}`);
        continue;
      }

      const userId = Number(user.userid);
      const userRankData = userRoleMap.get(userId);

      if (userRankData) {
        await prisma.rank
          .upsert({
            where: {
              userId_workspaceGroupId: {
                userId: user.userid,
                workspaceGroupId: groupID,
              },
            },
            update: { rankId: BigInt(userRankData.robloxRoleId) },
            create: {
              userId: user.userid,
              workspaceGroupId: groupID,
              rankId: BigInt(userRankData.robloxRoleId),
            },
          })
          .catch((err) =>
            console.error(
              `[update-group] Rank update failed for ${user.userid}:`,
              err
            )
          );
      }

      for (const userRole of user.roles) {
        if (userRole.isOwnerRole) continue;
        if (userRole.groupRoles === null || userRole.groupRoles === undefined)
          continue;

        const rm = roleMemberIndex.get(`${userRole.id}:${user.userid}`);
        const isManual = rm?.manuallyAdded ?? false;

        if (!userRankData) {
          if (isManual) {
            console.log(
              `[update-group] Keeping manual role "${userRole.name}" for absent user ${user.userid}`
            );
            continue;
          }
          console.log(
            `[update-group] Removing auto role "${userRole.name}" from absent user ${user.userid}`
          );
          await removeRoleFromUser(user.userid, userRole.id);
          continue;
        }

        if (userRole.groupRoles.length === 0) {
          if (isManual) continue;
          console.log(
            `[update-group] Removing unconfigured role "${userRole.name}" from ${user.userid}`
          );
          await removeRoleFromUser(user.userid, userRole.id);
          continue;
        }

        const groupRoleIds = userRole.groupRoles.map((id: any) => Number(id));
        const qualifies = groupRoleIds.includes(userRankData.robloxRoleId);

        if (!qualifies) {
          if (isManual) {
            console.log(
              `[update-group] Keeping manual role "${userRole.name}" for ${user.userid} despite rank change`
            );
            continue;
          }
          console.log(
            `[update-group] Removing role "${userRole.name}" from ${user.userid} — rank ${userRankData.robloxRoleId} not in [${groupRoleIds.join(", ")}]`
          );
          await removeRoleFromUser(user.userid, userRole.id);

          const remainingValid = user.roles.filter(
            (r) =>
              !r.isOwnerRole &&
              r.groupRoles &&
              r.groupRoles.length > 0 &&
              r.id !== userRole.id
          );
          if (remainingValid.length === 0) {
            console.log(
              `[update-group] No valid roles left for ${user.userid} — clearing department memberships`
            );
            await prisma.departmentMember
              .deleteMany({
                where: { workspaceGroupId: groupID, userId: user.userid },
              })
              .catch((err) =>
                console.error(
                  `[update-group] Dept cleanup failed for ${user.userid}:`,
                  err
                )
              );
          }
        }
      }
    }

    console.log(`[update-group] Completed sync for group ${groupID}`);
  } catch (err) {
    console.error(
      `[update-group] Fatal error syncing group ${groupID}:`,
      err
    );
    throw err;
  }
}

export async function checkSpecificUser(userID: number) {
  const ws = await prisma.workspace.findMany({});
  for (const w of ws) {
    await delay(500); // Delay between workspace checks

    const rankId = await retryNobloxRequest(() =>
      noblox.getRankInGroup(w.groupId, userID)
    ).catch(() => null);
    await prisma.rank.upsert({
      where: {
        userId_workspaceGroupId: {
          userId: BigInt(userID),
          workspaceGroupId: w.groupId,
        },
      },
      update: {
        rankId: BigInt(rankId || 0),
      },
      create: {
        userId: BigInt(userID),
        workspaceGroupId: w.groupId,
        rankId: BigInt(rankId || 0),
      },
    });

    if (!rankId) continue;

    await delay(300);
    const rankInfo = await retryNobloxRequest(() =>
      noblox.getRole(w.groupId, rankId)
    ).catch(() => null);
    if (!rankInfo) continue;
    const rank = rankInfo.id;

    if (!rank) continue;
    const role = await prisma.role.findFirst({
      where: {
        workspaceGroupId: w.groupId,
        groupRoles: {
          hasSome: [rank],
        },
      },
    });
    if (!role) continue;
    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(userID),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: w.groupId,
          },
        },
      },
    });
    if (!user) continue;
    if (user.roles.length) {
      if (user.roles[0].isOwnerRole) {
        console.log(
          `[update-group]Skipping role update for user ${userID} - they have an owner role`
        );
        continue;
      }
      await prisma.user.update({
        where: {
          userid: BigInt(userID),
        },
        data: {
          roles: {
            disconnect: {
              id: user.roles[0].id,
            },
          },
        },
      });
    }
    if (role.isOwnerRole) {
      console.log(
        `[update-group] Skipping assignment of owner role ${role.id} to user ${userID}`
      );
      continue;
    }
    await prisma.user.update({
      where: {
        userid: BigInt(userID),
      },
      data: {
        roles: {
          connect: {
            id: role.id,
          },
        },
      },
    });
    return true;
  }
}
