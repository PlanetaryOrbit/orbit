import prisma from "./database";
import type {
  NextApiRequest,
  NextApiResponse,
  NextApiHandler,
  GetServerSidePropsContext,
} from "next";
import * as noblox from "noblox.js";
import * as cookie from "cookie";
import { getConfig } from "./configEngine";
import { validateCsrf } from "./csrf";
import { getThumbnail } from "./userinfoEngine";
import { AuthenticatedRequest, AuthHandler, withAuth } from "@/lib/withAuth";
import { getSessionByToken } from "./session";

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
        err,
      ),
    );
  await prisma.roleMember
    .deleteMany({ where: { roleId, userId: userid } })
    .catch((err: any) =>
      console.error(
        `[update-group] Delete RoleMember ${roleId}/${userid} failed:`,
        err,
      ),
    );
}

async function retryNobloxRequest<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  initialDelay = 1000,
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = initialDelay * Math.pow(2, attempt - 1);
        console.log(
          `[retryNobloxRequest] Retrying after ${delayMs}ms (attempt ${
            attempt + 1
          }/${maxRetries})`,
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
          `[retryNobloxRequest] Rate limit hit, will retry (attempt ${
            attempt + 1
          }/${maxRetries})`,
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
): Promise<
  Map<number, { robloxRoleId: number; username: string; picture: string }>
> {
  const internalMap = new Map<
    number,
    { robloxRoleId: number; username: string; picture: string; _rank: number }
  >();

  const trackedRanks = ranks.filter((r) => r.rank !== 0);
  const apiKey = await getConfig("roblox_opencloud", groupID);

  for (const rank of trackedRanks) {
    let pageToken: string | undefined;

    do {
      await delay(250);

      const params = new URLSearchParams({
        maxPageSize: "100",
        filter: `role == 'groups/${groupID}/roles/${rank.id}'`,
      });
      if (pageToken) params.set("pageToken", pageToken);

      let response: Response;
      try {
        response = await retryNobloxRequest(() =>
          fetch(
            `https://apis.roblox.com/cloud/v2/groups/${groupID}/memberships?${params.toString()}`,
            {
              headers: {
                "x-api-key": apiKey.key,
              },
            },
          ).then((r) => {
            if (!r.ok) {
              const err: any = new Error(
                `Group memberships API returned ${r.status}`,
              );
              err.statusCode = r.status;
              throw err;
            }
            return r;
          }),
        );
      } catch (err: any) {
        const msg: string = err?.message ?? "";
        if (
          err?.statusCode === 401 ||
          err?.statusCode === 403 ||
          msg.toLowerCase().includes("unauthorized") ||
          msg.toLowerCase().includes("forbidden")
        ) {
          throw new Error(
            `Auth failure fetching memberships for role ${rank.id} — API key may be invalid or expired: ${msg}`,
          );
        }
        console.warn(
          `[buildGroupCache] Failed to fetch memberships for role ${rank.id}:`,
          err,
        );
        break;
      }

      const body = (await response.json()) as {
        groupMemberships: Array<{
          path: string;
          user: string;
          role: string;
        }>;
        nextPageToken?: string;
      };

      for (const membership of body.groupMemberships ?? []) {
        const userId = Number(membership.user?.split("/")[1]);
        if (!userId) continue;
        const existing = internalMap.get(userId);
        if (!existing || rank.rank > existing._rank) {
          internalMap.set(userId, {
            robloxRoleId: rank.id,
            username: "",
            picture: "",
            _rank: rank.rank,
          });
        }
      }

      pageToken = body.nextPageToken;
    } while (pageToken);
  }

  const userIds = Array.from(internalMap.keys());
  const bulkBatchSize = 100;

  for (let i = 0; i < userIds.length; i += bulkBatchSize) {
    const batch = userIds.slice(i, i + bulkBatchSize);

    await delay(300);

    try {
      const response = await retryNobloxRequest(() =>
        fetch("https://users.roblox.com/v1/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: batch, excludeBannedUsers: false }),
        }).then((r) => {
          if (!r.ok) {
            const err: any = new Error(`Users API returned ${r.status}`);
            err.statusCode = r.status;
            throw err;
          }
          return r.json() as Promise<{
            data: Array<{ id: number; name: string }>;
          }>;
        }),
      );

      for (const user of response.data) {
        const entry = internalMap.get(user.id);
        if (entry) internalMap.set(user.id, { ...entry, username: user.name });
      }
    } catch (err) {
      console.warn(
        `[buildGroupCache] Bulk username fetch failed for batch at ${i}:`,
        err,
      );
    }

    await delay(200);

    try {
      const ids = batch.join(",");
      const response = await retryNobloxRequest(() =>
        fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=180x180&format=Png&isCircular=false`,
        ).then((r) => {
          if (!r.ok) {
            const err: any = new Error(`Thumbnails API returned ${r.status}`);
            err.statusCode = r.status;
            throw err;
          }
          return r.json() as Promise<{
            data: Array<{
              targetId: number;
              state: string;
              imageUrl: string;
            }>;
          }>;
        }),
      );

      for (const item of response.data) {
        if (item.state !== "Completed" || !item.imageUrl) continue;
        const entry = internalMap.get(item.targetId);
        if (entry)
          internalMap.set(item.targetId, { ...entry, picture: item.imageUrl });
      }
    } catch (err) {
      console.warn(
        `[buildGroupCache] Bulk avatar fetch failed for batch at ${i}:`,
        err,
      );
    }
  }

  const userRoleMap = new Map<
    number,
    { robloxRoleId: number; username: string; picture: string }
  >();
  for (const [userId, { robloxRoleId, username, picture }] of internalMap) {
    userRoleMap.set(userId, { robloxRoleId, username, picture });
  }

  groupCacheStore.set(groupID, { userRoleMap, builtAt: new Date() });
  return userRoleMap;
}

export function withPermissionCheck(
  handler: AuthHandler,
  permission?: string | string[],
) {
  return withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!validateCsrf(req, res)) {
      return res.status(403).json({
        success: false,
        error: "CSRF validation failed. Invalid origin or referer.",
      });
    }

    const PLANETARY_CLOUD_URL = process.env.PLANETARY_CLOUD_URL;
    const PLANETARY_CLOUD_SERVICE_KEY = process.env.PLANETARY_CLOUD_SERVICE_KEY;
    if (PLANETARY_CLOUD_URL && PLANETARY_CLOUD_SERVICE_KEY?.length) {
      if (
        req.headers["x-planetary-cloud-service-key"] ===
        PLANETARY_CLOUD_SERVICE_KEY
      ) {
        return handler(req, res);
      }
    }

    const uid = req.auth.userId; // BigInt, from withAuth
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
      if (permissions.some((perm) => cachedData.permissions?.includes(perm)))
        return handler(req, res);
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const user = await prisma.user.findFirst({
      where: { userid: uid },
      include: {
        roles: { where: { workspaceGroupId: workspaceId } },
        workspaceMemberships: { where: { workspaceGroupId: workspaceId } },
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
      } catch {
        const existing = await prisma.workspaceMember.findUnique({
          where: {
            workspaceGroupId_userId: {
              workspaceGroupId: workspaceId,
              userId: Number(uid),
            },
          },
        });
        if (existing) membership = existing;
      }
    }

    if (!membership)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const isAdmin = membership.isAdmin || false;
    const userrole = user.roles[0];

    permissionsCache.set(cacheKey, {
      data: { permissions: userrole?.permissions || [], isAdmin },
      timestamp: now,
    });

    if (isAdmin) return handler(req, res);
    if (!permission) return handler(req, res);
    if (!userrole)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const permissions = Array.isArray(permission) ? permission : [permission];
    if (permissions.some((perm) => userrole?.permissions?.includes(perm)))
      return handler(req, res);
    return res.status(401).json({ success: false, error: "Unauthorized" });
  });
}

export function withPermissionCheckSsr(
  handler: (context: GetServerSidePropsContext) => Promise<any>,
  permission?: string | string[],
) {
  return async (context: GetServerSidePropsContext) => {
    const { req, res, query } = context;

    // Read session token from cookie
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.session_token;
    if (!token)
      return { redirect: { destination: "/login", permanent: false } };

    const session = await getSessionByToken(token);
    if (!session)
      return { redirect: { destination: "/login", permanent: false } };

    const uid = session.userId;

    (req as any).auth = { userId: uid, token };

    const PLANETARY_CLOUD_URL = process.env.PLANETARY_CLOUD_URL;
    const PLANETARY_CLOUD_SERVICE_KEY = process.env.PLANETARY_CLOUD_SERVICE_KEY;
    if (PLANETARY_CLOUD_URL && PLANETARY_CLOUD_SERVICE_KEY?.length) {
      if (
        req.headers["x-planetary-cloud-service-key"] ===
        PLANETARY_CLOUD_SERVICE_KEY
      ) {
        return handler(context);
      }
    }

    if (!query.id) return { redirect: { destination: "/", permanent: false } };

    const workspaceId = parseInt(query.id as string);
    const cacheKey = `permissions_${uid}_${workspaceId}`;
    const now = Date.now();
    const cached = permissionsCache.get(cacheKey);

    if (cached && now - cached.timestamp < PERMISSIONS_CACHE_DURATION) {
      const cachedData = cached.data;
      if (cachedData.isAdmin) return handler(context);
      if (!permission) return handler(context);
      const permissions = Array.isArray(permission) ? permission : [permission];
      if (permissions.some((perm) => cachedData.permissions?.includes(perm)))
        return handler(context);
      return { redirect: { destination: "/", permanent: false } };
    }

    const user = await prisma.user.findFirst({
      where: { userid: uid },
      include: {
        roles: { where: { workspaceGroupId: workspaceId } },
        workspaceMemberships: { where: { workspaceGroupId: workspaceId } },
      },
    });
    if (!user) return { redirect: { destination: "/", permanent: false } };

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
      } catch {
        const existing = await prisma.workspaceMember.findUnique({
          where: {
            workspaceGroupId_userId: {
              workspaceGroupId: workspaceId,
              userId: Number(uid),
            },
          },
        });
        if (existing) membership = existing;
      }
    }

    if (!membership)
      return { redirect: { destination: "/", permanent: false } };

    const isAdmin = membership.isAdmin || false;
    const userrole = user.roles[0];

    permissionsCache.set(cacheKey, {
      data: { permissions: userrole?.permissions || [], isAdmin },
      timestamp: now,
    });

    if (isAdmin) return handler(context);
    if (!permission) return handler(context);
    if (!userrole) return { redirect: { destination: "/", permanent: false } };

    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasPermission = user.roles.some((role) =>
      permissions.some((perm) => role.permissions.includes(perm)),
    );
    if (!hasPermission)
      return { redirect: { destination: "/", permanent: false } };

    return handler(context);
  };
}

export async function checkGroupRoles(groupID: number) {
  try {
    if (!Number.isSafeInteger(groupID) || groupID <= 0) {
      throw new Error(`Invalid groupID: ${groupID}`);
    }
    const safeGroupId = String(groupID);
    const encGID = encodeURIComponent(safeGroupId);

    console.log(`[update-group] Starting sync for group ${safeGroupId}`);
    const apiKey = await getConfig("roblox_opencloud", groupID);
    let successful = true;

    try {
      const logoUrl = new URL("https://thumbnails.roblox.com/v1/groups/icons");
      logoUrl.searchParams.set("groupIds", safeGroupId);
      logoUrl.searchParams.set("size", "420x420");
      logoUrl.searchParams.set("format", "Png");

      const groupUrl = new URL(
        `https://apis.roblox.com/cloud/v2/groups/${encGID}`,
      );
      const [logoRes, groupRes] = await Promise.all([
        fetch(logoUrl.toString())
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(groupUrl.toString(), {
          headers: { "x-api-key": apiKey.key },
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const logo = logoRes?.data?.[0]?.imageUrl ?? null;
      const group = groupRes ? { name: groupRes.displayName } : null;
      console.log(
        `[update-group] Fetched group info for ${groupID} - logo: ${!!logo}, group: ${!!group}`,
      );
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
      await prisma.workspace.update({
        where: {
          groupId: groupID,
        },
        data: {
          lastSyncedSuccessful: false,
        },
      });
    }

    try {
      const ownerRoles = await prisma.role.findMany({
        where: { workspaceGroupId: groupID, isOwnerRole: true },
        include: { members: true },
      });

      for (const ownerRole of ownerRoles) {
        console.log(
          `[update-group] Migrating ${ownerRole.members.length} users from owner role ${ownerRole.id}`,
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
            `[update-group] Created default fallback role for group ${groupID}`,
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
            }),
          ),
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
              noblox.getRole(groupID, rankId),
            )
              .then((info) =>
                availableRoles.find((r) =>
                  (r.groupRoles ?? []).map(Number).includes(info.id),
                ),
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
                err,
              ),
            );
        }

        await prisma.role
          .delete({ where: { id: ownerRole.id } })
          .catch((err) =>
            console.error(
              `[update-group] Failed to delete owner role ${ownerRole.id}:`,
              err,
            ),
          );
      }

      if (ownerRoles.length > 0) {
        console.log(
          `[update-group] Migrated ${ownerRoles.length} owner roles to isAdmin for group ${groupID}`,
        );
      }
    } catch (err) {
      console.error(`[update-group] Failed to migrate owner roles:`, err);
      successful = false;
    }

    const rolesUrl = new URL(
      `https://apis.roblox.com/cloud/v2/groups/${encGID}/roles`,
    );
    rolesUrl.searchParams.set("maxPageSize", "20");

    const rss = await retryNobloxRequest(() =>
      fetch(
        rolesUrl.toString(),
        {
          headers: { "x-api-key": apiKey.key },
        },
      ).then(async (r) => {
        if (!r.ok) {
          const err: any = new Error(`Roles API returned ${r.status}`);
          err.statusCode = r.status;
          throw err;
        }
        const body = (await r.json()) as {
          groupRoles: Array<{ id: string; rank: number; displayName: string }>;
          nextPageToken?: string;
        };
        // map to same shape noblox returned so downstream code stays the same
        return body.groupRoles.map((r) => ({
          id: Number(r.id),
          rank: r.rank,
          name: r.displayName,
        }));
      }),
    );
    if (!rss) {
      console.log(
        `[update-group] No roles found for group ${groupID}, aborting.`,
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
      `[update-group] Processing ${trackedRanks.length} tracked ranks for group ${groupID}`,
    );

    groupCacheStore.delete(groupID);
    const userRoleMap = await buildGroupCache(groupID, trackedRanks).catch(
      () => {
        successful = false;
        return new Map<number, { robloxRoleId: number; username: string }>();
      },
    );
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

    const roleMemberIndex = new Map<string, (typeof allRoleMembers)[number]>();
    for (const rm of allRoleMembers) {
      roleMemberIndex.set(`${rm.roleId}:${rm.userId}`, rm);
    }

    const usersInDbIndex = new Map(
      usersWithRoles.map((u) => [Number(u.userid), u]),
    );

    console.log(
      `[update-group] Loaded ${usersWithRoles.length} users and ${allRoleMembers.length} role memberships from DB`,
    );

    for (const [userId, { robloxRoleId, username }] of userRoleMap.entries()) {
      try {
        const workspaceRole = rs.find((r) =>
          (r.groupRoles ?? []).map(Number).includes(robloxRoleId),
        );
        if (!workspaceRole || workspaceRole.isOwnerRole) continue;

        const userInDb = usersInDbIndex.get(userId);
        const hasRole = userInDb?.roles.some((r) => r.id === workspaceRole.id);

        if (hasRole) {
          await prisma.user
            .update({
              where: { userid: BigInt(userId) },
              data: { username },
            })
            .catch((err) => {
              console.error(
                `[update-group] Username update failed for ${userId}:`,
                err,
              );
              successful = false;
            });
        } else {
          console.log(
            `[update-group] Adding role "${workspaceRole.name}" to user ${userId} (RID: ${robloxRoleId})`,
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
            .catch((err) => {
              console.error(`[update-group] Upsert failed for ${userId}:`, err);
              successful = false;
            });

          await prisma.workspaceMember
            .upsert({
              where: {
                workspaceGroupId_userId: {
                  workspaceGroupId: groupID,
                  userId: BigInt(userId),
                },
              },
              update: {},
              create: {
                workspaceGroupId: groupID,
                userId: BigInt(userId),
                joinDate: new Date(),
              },
            })
            .then((result) => {
              if (
                !result.joinDate ||
                result.joinDate.getTime() === new Date().setSeconds(0, 0)
              ) {
              } else {
                console.log(
                  `[update-group] Added user ${userId} to workspace ${groupID}`,
                );
              }
            })
            .catch((err) => {
              console.error(
                `[update-group] WorkspaceMember upsert failed for ${userId}:`,
                err,
              );
              successful = false;
            });
        }
        await prisma.workspaceMember
          .upsert({
            where: {
              workspaceGroupId_userId: {
                workspaceGroupId: groupID,
                userId: BigInt(userId),
              },
            },
            update: {},
            create: {
              workspaceGroupId: groupID,
              userId: BigInt(userId),
              joinDate: new Date(),
            },
          })
          .catch((err) => {
            console.error(
              `[update-group] WorkspaceMember upsert failed for ${userId}:`,
              err,
            );
            successful = false;
          });

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
          .catch((err) => {
            console.error(
              `[update-group] Rank upsert failed for ${userId}:`,
              err,
            );
            successful = false;
          });
      } catch (err) {
        console.error(`[update-group] Error processing user ${userId}:`, err);
        successful = false;
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
          .catch((err) => {
            console.error(
              `[update-group] Rank update failed for ${user.userid}:`,
              err,
            );
            successful = false;
          });
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
              `[update-group] Keeping manual role "${userRole.name}" for absent user ${user.userid}`,
            );
            continue;
          }
          console.log(
            `[update-group] Removing auto role "${userRole.name}" from absent user ${user.userid}`,
          );
          await removeRoleFromUser(user.userid, userRole.id);
          continue;
        }

        if (userRole.groupRoles.length === 0) {
          if (isManual) continue;
          console.log(
            `[update-group] Removing unconfigured role "${userRole.name}" from ${user.userid}`,
          );
          await removeRoleFromUser(user.userid, userRole.id);
          continue;
        }

        const groupRoleIds = userRole.groupRoles.map((id: any) => Number(id));
        const qualifies = groupRoleIds.includes(userRankData.robloxRoleId);

        if (!qualifies) {
          if (isManual) {
            console.log(
              `[update-group] Keeping manual role "${userRole.name}" for ${user.userid} despite rank change`,
            );
            continue;
          }
          console.log(
            `[update-group] Removing role "${userRole.name}" from ${user.userid} — rank ${userRankData.robloxRoleId} not in [${groupRoleIds.join(", ")}]`,
          );
          await removeRoleFromUser(user.userid, userRole.id);

          const remainingValid = user.roles.filter(
            (r) =>
              !r.isOwnerRole &&
              r.groupRoles &&
              r.groupRoles.length > 0 &&
              r.id !== userRole.id,
          );
          if (remainingValid.length === 0) {
            console.log(
              `[update-group] No valid roles left for ${user.userid} — clearing department memberships`,
            );
            await prisma.departmentMember
              .deleteMany({
                where: { workspaceGroupId: groupID, userId: user.userid },
              })
              .catch((err) => {
                console.error(
                  `[update-group] Dept cleanup failed for ${user.userid}:`,
                  err,
                );
                successful = false;
              });
          }
        }
      }
    }

    console.log(
      `[update-group] ${successful ? "Completed" : "Failed"} sync for group ${groupID}`,
    );
    await prisma.workspace.update({
      where: {
        groupId: groupID,
      },
      data: {
        lastSyncedSuccessful: successful,
      },
    });
  } catch (err) {
    console.error(`[update-group] Fatal error syncing group ${groupID}:`, err);
    await prisma.workspace.update({
      where: {
        groupId: groupID,
      },
      data: {
        lastSyncedSuccessful: false,
      },
    });
    throw err;
  }
}

export async function checkSpecificUser(userID: number | bigint) {
  const ws = await prisma.workspace.findMany({});
  for (const w of ws) {
    await delay(500); // Delay between workspace checks

    const rankId = await retryNobloxRequest(() =>
      noblox.getRankInGroup(w.groupId, Number(userID)),
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
      noblox.getRole(w.groupId, rankId),
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
          `[update-group] Skipping role update for user ${userID} - they have an owner role`,
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
        `[update-group] Skipping assignment of owner role ${role.id} to user ${userID}`,
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
  }
  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId: userID,
        },
      },
    },
  });

  return workspaces;
}
