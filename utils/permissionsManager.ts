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
import { getThumbnail } from "./userinfoEngine";

const permissionsCache = new Map<string, { data: any; timestamp: number }>();
const PERMISSIONS_CACHE_DURATION = 120000;

type MiddlewareData = {
  handler: NextApiHandler;
  next: any;
  permissions: string;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        console.log(`[retryNobloxRequest] Retrying after ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await delay(delayMs);
      }
      
      return await fn();
    } catch (error: any) {
      lastError = error;
      // prevent rate limited requests from failing immediately (hopefully)
      const isRateLimitError = 
        error?.statusCode === 429 || 
        error?.statusCode === 401 ||
        (error?.message && error.message.toLowerCase().includes('too many requests'));
      
      if (isRateLimitError && attempt < maxRetries - 1) {
        console.log(`[retryNobloxRequest] Rate limit hit, will retry (attempt ${attempt + 1}/${maxRetries})`);
        continue;
      }
      
      if (!isRateLimitError || attempt === maxRetries - 1) {
        throw error;
      }
    }
  }
  
  throw lastError;
}

export function withPermissionCheck(
  handler: NextApiHandler,
  permission?: string | string[]
) {
  return withSessionRoute(async (req: NextApiRequest, res: NextApiResponse) => {
    const uid = req.session.userid;
    const PLANETARY_CLOUD_URL = process.env.PLANETARY_CLOUD_URL;
    const PLANETARY_CLOUD_SERVICE_KEY = process.env.PLANETARY_CLOUD_SERVICE_KEY;
    if (
      PLANETARY_CLOUD_URL !== undefined &&
      PLANETARY_CLOUD_SERVICE_KEY !== undefined
    ) {
      if (
        req.headers["x-planetary-cloud-service-key"] ==
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
    if (cached && (now - cached.timestamp) < PERMISSIONS_CACHE_DURATION) {
      const userrole = cached.data;
      if (userrole.isOwnerRole) return handler(req, res);
      if (!permission) return handler(req, res);
      const permissions = Array.isArray(permission) ? permission : [permission];
      const hasPermission = permissions.some(perm => userrole.permissions?.includes(perm));
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
          orderBy: {
            isOwnerRole: "desc",
          },
        },
      },
    });
    if (!user)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    const userrole = user.roles[0];
    if (!userrole)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    permissionsCache.set(cacheKey, { data: userrole, timestamp: now });
    
    if (userrole.isOwnerRole) return handler(req, res);
    if (!permission) return handler(req, res);
    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasPermission = permissions.some(perm => userrole.permissions?.includes(perm));
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
      PLANETARY_CLOUD_SERVICE_KEY !== undefined
    ) {
      if (
        req.headers["x-planetary-cloud-service-key"] ==
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
    if (cached && (now - cached.timestamp) < PERMISSIONS_CACHE_DURATION) {
      const userrole = cached.data;
      if (userrole.isOwnerRole) return handler(context);
      if (!permission) return handler(context);
      const permissions = Array.isArray(permission) ? permission : [permission];
      const hasPermission = permissions.some(perm => userrole.permissions?.includes(perm));
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
          orderBy: {
            isOwnerRole: "desc",
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

    const userrole = user.roles[0];
    if (!userrole) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }
    permissionsCache.set(cacheKey, { data: userrole, timestamp: now });
    const permissions = Array.isArray(permission) ? permission : (permission ? [permission] : []);
    const hasPermission =
      !permission ||
      user?.roles.some(
        (role) => role.isOwnerRole || permissions.some(perm => role.permissions.includes(perm))
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
        noblox.getGroup(groupID).catch(() => null)
      ]);
      
      if (logo || group) {
        await prisma.workspace.update({
          where: { groupId: groupID },
          data: {
            ...(group && { groupName: group.name }),
            ...(logo && { groupLogo: logo }),
            lastSynced: new Date()
          }
        });
        console.log(`[update-group] Updated group info cache for ${groupID}`);
      }
    } catch (err) {
      console.error(`[update-group] Failed to update group info cache:`, err);
    }

    const allPermissions = [
      'admin',
      'view_staff_config',
      'manage_sessions',
      'sessions_unscheduled',
      'sessions_scheduled',
      'sessions_assign',
      'sessions_claim',
      'sessions_host',
      'manage_activity',
      'post_on_wall',
      'manage_wall',
      'manage_views',
      'view_wall',
      'view_members',
      'manage_members',
      'manage_quotas',
      'manage_docs',
      'manage_policies',
      'view_entire_groups_activity',
      'manage_alliances',
      'represent_alliance'
    ];

    try {
      await prisma.role.updateMany({
        where: {
          workspaceGroupId: groupID,
          isOwnerRole: true,
        },
        data: {
          permissions: allPermissions,
        },
      });
      console.log(`[update-group] Updated owner role permissions for group ${groupID}`);
    } catch (error) {
      console.error(
        `[update-group] Failed to update owner role permissions for group ${groupID}:`,
        error
      );
    }

    const rss = await retryNobloxRequest(() => noblox.getRoles(groupID)).catch((error) => {
      console.error(
        `[update-group] Failed to get roles for group ${groupID}:`,
        error
      );
      return null;
    });
    if (!rss) {
      console.log(`[update-group] No roles found for group ${groupID}`);
      return;
    }

    const ranks: noblox.Role[] = [];

    const rs = await prisma.role
      .findMany({
        where: {
          workspaceGroupId: groupID,
        },
      })
      .catch((error) => {
        console.error(
          `[update-group] Failed to fetch roles from database for group ${groupID}:`,
          error
        );
        return [];
      });

    const config = await getConfig("activity", groupID).catch((error) => {
      console.error(
        `[update-group] Failed to get config for group ${groupID}:`,
        error
      );
      return null;
    });
    const minTrackedRole = config?.role || 0;

    for (const role of rss) {
      if (role.rank < minTrackedRole) continue;
      ranks.push(role);
    }
    console.log(
      `[update-group] Processing ${ranks.length} ranks for group ${groupID}`
    );

    if (ranks && ranks.length) {
      for (const rank of ranks) {
        try {
          console.log(
            `[update-group] Processing rank ${rank.name} (${rank.id}) for group ${groupID}`
          );

          const role = rs.find((r) => r.groupRoles?.includes(rank.id));
          
          // Add delay and retry for getPlayers
          await delay(500); // Small delay between rank processing
          const members = await retryNobloxRequest(() => noblox.getPlayers(groupID, rank.id)).catch((error) => {
            console.error(
              `[update-group] Failed to get players for rank ${rank.id}:`,
              error
            );
            return null;
          });
          if (!members) {
            console.log(
              `[update-group] No members found for rank ${rank.id}, skipping`
            );
            continue;
          }

          const users = await prisma.user
            .findMany({
              where: {},
              include: {
                roles: {
                  where: {
                    workspaceGroupId: groupID,
                  },
                },
                ranks: {
                  where: {
                    workspaceGroupId: groupID,
                  },
                },
              },
            })
            .catch((error) => {
              console.error(
                `[update-group] Failed to fetch users from database:`,
                error
              );
              return [];
            });
          for (const user of users) {
            try {
              if (
                user.ranks?.find((r) => r.workspaceGroupId === groupID)
                  ?.rankId === BigInt(rank.rank)
              )
                continue;
              if (
                members.find((member) => member.userId === Number(user.userid))
              ) {
                await prisma.rank
                  .upsert({
                    where: {
                      userId_workspaceGroupId: {
                        userId: user.userid,
                        workspaceGroupId: groupID,
                      },
                    },
                    update: {
                      rankId: BigInt(rank.rank),
                    },
                    create: {
                      userId: user.userid,
                      workspaceGroupId: groupID,
                      rankId: BigInt(rank.rank),
                    },
                  })
                  .catch((error) => {
                    console.error(
                      `[update-group] Failed to upsert rank for user ${user.userid}:`,
                      error
                    );
                  });
              }
            } catch (error) {
              console.error(
                `[update-group] Error processing rank for user ${user.userid}:`,
                error
              );
            }
          }

          if (role) {
            for (const user of users) {
              try {
                if (!user.roles.find((r) => r.id === role?.id)) continue;
                if (rs.find((r) => r.groupRoles?.includes(rank.id))) continue;
                if (
                  members.find(
                    (member) => member.userId === Number(user.userid)
                  )
                )
                  continue;
                if (user.roles.find((r) => r.id === role?.id)?.isOwnerRole) {
                  console.log(
                    `[update-group] Skipping role removal for user ${user.userid} - they have an owner role`
                  );
                  continue;
                }
                await prisma.user
                  .update({
                    where: {
                      userid: user.userid,
                    },
                    data: {
                      roles: {
                        disconnect: {
                          id: role?.id,
                        },
                      },
                    },
                  })
                  .catch((error) => {
                    console.error(
                      `[update-group] Failed to disconnect role for user ${user.userid}:`,
                      error
                    );
                  });
              } catch (error) {
                console.error(
                  `[update-group] Error removing role for user ${user.userid}:`,
                  error
                );
              }
            }

            for (const member of members) {
              try {
                if (
                  users
                    .find((user) => Number(user.userid) === member.userId)
                    ?.roles.find((r) => r.id === role?.id)
                ) {
                  await prisma.user
                    .update({
                      where: {
                        userid: BigInt(member.userId),
                      },
                      data: {
                        username: member.username,
                      },
                    })
                    .catch((error) => {
                      console.error(
                        `[update-group] Failed to update username for user ${member.userId}:`,
                        error
                      );
                    });
                  await prisma.rank
                    .upsert({
                      where: {
                        userId_workspaceGroupId: {
                          userId: BigInt(member.userId),
                          workspaceGroupId: groupID,
                        },
                      },
                      update: {
                        rankId: BigInt(rank.rank),
                      },
                      create: {
                        userId: BigInt(member.userId),
                        workspaceGroupId: groupID,
                        rankId: BigInt(rank.rank),
                      },
                    })
                    .catch((error) => {
                      console.error(
                        `[update-group] Failed to upsert rank for existing user ${member.userId}:`,
                        error
                      );
                    });
                  continue;
                }

                const user = await prisma.user
                  .findFirst({
                    where: {
                      userid: BigInt(member.userId),
                      roles: {
                        some: {
                          workspaceGroupId: groupID,
                        },
                      },
                    },
                  })
                  .catch((error) => {
                    console.error(
                      `[update-group] Failed to find user ${member.userId}:`,
                      error
                    );
                    return null;
                  });
                if (user) continue;

                if (role.isOwnerRole) {
                  console.log(
                    `[update-group] Skipping assignment of owner role ${role.id} to new user ${member.userId}`
                  );
                  continue;
                }

                await prisma.user
                  .upsert({
                    where: {
                      userid: member.userId,
                    },
                    create: {
                      userid: member.userId,
                      roles: {
                        connect: {
                          id: role.id,
                        },
                      },
                      username: member.username,
                      picture: getThumbnail(member.userId),
                    },
                    update: {
                      roles: {
                        connect: {
                          id: role.id,
                        },
                      },
                      username: member.username,
                    },
                  })
                  .catch((error) => {
                    console.error(
                      `[update-group] Failed to upsert user ${member.userId}:`,
                      error
                    );
                  });

                await prisma.rank
                  .upsert({
                    where: {
                      userId_workspaceGroupId: {
                        userId: BigInt(member.userId),
                        workspaceGroupId: groupID,
                      },
                    },
                    update: {
                      rankId: BigInt(rank.rank),
                    },
                    create: {
                      userId: BigInt(member.userId),
                      workspaceGroupId: groupID,
                      rankId: BigInt(rank.rank),
                    },
                  })
                  .catch((error) => {
                    console.error(
                      `[update-group] Failed to upsert rank for new user ${member.userId}:`,
                      error
                    );
                  });
              } catch (error) {
                console.error(
                  `[update-group] Error processing member ${member.userId}:`,
                  error
                );
              }
            }
          }
        } catch (error) {
          console.error(
            `[update-group] Error processing rank ${rank.id}:`,
            error
          );
        }
      }
    }

    console.log(`[update-group] Completed role sync for group ${groupID}`);
  } catch (error) {
    console.error(
      `[update-group] Fatal error syncing group ${groupID}:`,
      error
    );
    throw error;
  }
}

export async function checkSpecificUser(userID: number) {
  const ws = await prisma.workspace.findMany({});
  for (const w of ws) {
    await delay(500); // Delay between workspace checks
    
    const rankId = await retryNobloxRequest(() => noblox.getRankInGroup(w.groupId, userID))
      .catch(() => null);
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
    
    await delay(300); // Small delay before getRole
    const rankInfo = await retryNobloxRequest(() => noblox.getRole(w.groupId, rankId))
      .catch(() => null);
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
