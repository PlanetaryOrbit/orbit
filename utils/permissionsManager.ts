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

const permissionsCache = new Map<string, { data: any; timestamp: number }>();
const PERMISSIONS_CACHE_DURATION = 120000;

type MiddlewareData = {
  handler: NextApiHandler;
  next: any;
  permissions: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
          `[retryNobloxRequest] Retrying after ${delayMs}ms (attempt ${
            attempt + 1
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
          `[retryNobloxRequest] Rate limit hit, will retry (attempt ${
            attempt + 1
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

    // Migrate users from old admin role to new workspace membership check
    try {
      const ownerRoles = await prisma.role.findMany({
        where: {
          workspaceGroupId: groupID,
          isOwnerRole: true,
        },
        include: {
          members: true,
        },
      });

      for (const ownerRole of ownerRoles) {
        console.log(
          `[update-group] Migrating ${ownerRole.members.length} users from owner role ${ownerRole.id} to membership admin`
        );
        const availableRoles = await prisma.role.findMany({
          where: {
            workspaceGroupId: groupID,
            id: {
              not: ownerRole.id,
            },
          },
        });

        let fallbackRole;
        if (availableRoles.length === 0) {
          fallbackRole = await prisma.role.create({
            data: {
              workspaceGroupId: groupID,
              name: "Default",
              permissions: [],
              groupRoles: [],
              isOwnerRole: false,
            },
          });
          console.log(
            `[update-group] Created default fallback role for group ${groupID}`
          );
          availableRoles.push(fallbackRole);
        }

        for (const member of ownerRole.members) {
          await prisma.workspaceMember
            .upsert({
              where: {
                workspaceGroupId_userId: {
                  workspaceGroupId: groupID,
                  userId: member.userid,
                },
              },
              update: {
                isAdmin: true,
              },
              create: {
                workspaceGroupId: groupID,
                userId: member.userid,
                joinDate: new Date(),
                isAdmin: true,
              },
            })
            .catch((error) => {
              console.error(
                `[update-group] Failed to set isAdmin for user ${member.userid}:`,
                error
              );
            });

          let targetRole = null;
          const userRank = await prisma.rank
            .findFirst({
              where: {
                userId: member.userid,
                workspaceGroupId: groupID,
              },
            })
            .catch(() => null);

          if (userRank) {
            const rankId = Number(userRank.rankId);
            const roleWithRank = await retryNobloxRequest(() =>
              noblox.getRole(groupID, rankId)
            )
              .then((roleInfo) => {
                return availableRoles.find((r) =>
                  r.groupRoles?.includes(roleInfo.id)
                );
              })
              .catch(() => null);

            if (roleWithRank) {
              targetRole = roleWithRank;
              console.log(
                `[update-group] Found role ${targetRole.name} matching user ${member.userid} rank`
              );
            }
          }

          if (!targetRole && availableRoles.length > 0) {
            targetRole = availableRoles[0];
            console.log(
              `[update-group] Using fallback role ${targetRole.name} for user ${member.userid}`
            );
          }

          if (targetRole) {
            await prisma.user
              .update({
                where: {
                  userid: member.userid,
                },
                data: {
                  roles: {
                    disconnect: {
                      id: ownerRole.id,
                    },
                    connect: {
                      id: targetRole.id,
                    },
                  },
                },
              })
              .catch((error) => {
                console.error(
                  `[update-group] Failed to swap role for user ${member.userid}:`,
                  error
                );
              });
          }
        }

        await prisma.role
          .delete({
            where: {
              id: ownerRole.id,
            },
          })
          .catch((error) => {
            console.error(
              `[update-group] Failed to delete owner role ${ownerRole.id}:`,
              error
            );
          });
      }

      if (ownerRoles.length > 0) {
        console.log(
          `[update-group] Migrated ${ownerRoles.length} owner roles to isAdmin memberships for group ${groupID}`
        );
      }
    } catch (error) {
      console.error(
        `[update-group] Failed to migrate owner roles for group ${groupID}:`,
        error
      );
    }

    const rss = await retryNobloxRequest(() => noblox.getRoles(groupID)).catch(
      (error) => {
        console.error(
          `[update-group] Failed to get roles for group ${groupID}:`,
          error
        );
        return null;
      }
    );
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
      `[update-group] Processing ${ranks.length} tracked ranks for group ${groupID}`
    );
    const userRoleMap = new Map<number, { roleId: number; username: string }>();
    
    if (ranks && ranks.length) {
      console.log(`[update-group] Fetching members for ${ranks.length} tracked ranks...`);
      
      for (const rank of ranks) {
        if (rank.rank === 0) continue;
        
        console.log(
          `[update-group] Fetching members from rank ${rank.name} (Role ID: ${rank.id}, Rank: ${rank.rank})...`
        );
        
        await delay(500);
        const members = await retryNobloxRequest(() =>
          noblox.getPlayers(groupID, rank.id)
        ).catch((error) => {
          console.error(
            `[update-group] Failed to get players for rank ${rank.name}:`,
            error
          );
          return null;
        });
        
        if (!members) {
          console.log(`[update-group] No members found for rank ${rank.name}`);
          continue;
        }
        
        console.log(
          `[update-group] Fetched ${members.length} members from rank ${rank.name}`
        );

        for (const member of members) {
          userRoleMap.set(member.userId, { 
            roleId: rank.id, 
            username: member.username 
          });
        }
      }
      
      console.log(
        `[update-group] Cached ${userRoleMap.size} unique users across all tracked ranks`
      );
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
    
    console.log(`[update-group] Fetched ${users.length} users from database`);

    for (const [userId, userData] of userRoleMap.entries()) {
      try {
        const { roleId, username } = userData;
        const workspaceRole = rs.find((r) => r.groupRoles?.includes(roleId));
        
        if (!workspaceRole) {
          continue;
        }
        
        if (workspaceRole.isOwnerRole) {
          continue;
        }
        
        const userInDb = users.find((u) => Number(u.userid) === userId);
        const hasRole = userInDb?.roles.some((r) => r.id === workspaceRole.id);
        
        if (hasRole) {
          await prisma.user
            .update({
              where: { userid: BigInt(userId) },
              data: { username },
            })
            .catch((error) => {
              console.error(
                `[update-group] Failed to update username for user ${userId}:`,
                error
              );
            });
        } else {
          console.log(
            `[update-group] Adding role "${workspaceRole.name}" to user ${userId} (RID: ${roleId})`
          );
          
          await prisma.user
            .upsert({
              where: { userid: BigInt(userId) },
              create: {
                userid: BigInt(userId),
                username,
                picture: getThumbnail(userId),
                roles: {
                  connect: { id: workspaceRole.id },
                },
              },
              update: {
                username,
                roles: {
                  connect: { id: workspaceRole.id },
                },
              },
            })
            .catch((error) => {
              console.error(
                `[update-group] Failed to upsert user ${userId}:`,
                error
              );
            });
        }
        
        await prisma.rank
          .upsert({
            where: {
              userId_workspaceGroupId: {
                userId: BigInt(userId),
                workspaceGroupId: groupID,
              },
            },
            update: {
              rankId: BigInt(roleId),
            },
            create: {
              userId: BigInt(userId),
              workspaceGroupId: groupID,
              rankId: BigInt(roleId),
            },
          })
          .catch((error) => {
            console.error(
              `[update-group] Failed to upsert rank for user ${userId}:`,
              error
            );
          });
      } catch (error) {
        console.error(
          `[update-group] Error processing user ${userId}:`,
          error
        );
      }
    }

    console.log(`[update-group] Starting role cleanup for group ${groupID}`);
    try {
      const usersWithRoles = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              workspaceGroupId: groupID,
            },
          },
        },
        include: {
          roles: {
            where: {
              workspaceGroupId: groupID,
            },
          },
          workspaceMemberships: {
            where: {
              workspaceGroupId: groupID,
            },
          },
        },
      });

      console.log(
        `[update-group] Found ${usersWithRoles.length} users with roles for cleanup check`
      );
      console.log(
        `[update-group] Reusing cached role membership data (${userRoleMap.size} group members)`
      );

      for (const user of usersWithRoles) {
        const membership = user.workspaceMemberships[0];
        if (membership?.isAdmin) {
          console.log(
            `[update-group] Skipping cleanup for workspace owner ${user.userid}.`
          );
          continue;
        }

        const userId = Number(user.userid);
        const userRankData = userRoleMap.get(userId);
        
        if (!userRankData) {
          console.log(
            `[update-group] User ${user.userid} is not in any tracked roles - removing all auto-managed roles`
          );
          
          for (const userRole of user.roles) {
            if (userRole.isOwnerRole) {
              continue;
            }
            
            if (userRole.groupRoles === null || userRole.groupRoles === undefined) {
              continue;
            }
            
            console.log(
              `[update-group] Removing auto-managed role "${userRole.name}" from user ${user.userid}`
            );
            
            await prisma.user
              .update({
                where: { userid: user.userid },
                data: { roles: { disconnect: { id: userRole.id } } },
              })
              .catch((error) => {
                console.error(
                  `[update-group] Failed to remove role ${userRole.id} from user ${user.userid}:`,
                  error
                );
              });
          }
          continue;
        }
        
        const currentRobloxRoleId = userRankData.roleId;
        
        await prisma.rank
          .upsert({
            where: {
              userId_workspaceGroupId: {
                userId: user.userid,
                workspaceGroupId: groupID,
              },
            },
            update: {
              rankId: BigInt(currentRobloxRoleId),
            },
            create: {
              userId: user.userid,
              workspaceGroupId: groupID,
              rankId: BigInt(currentRobloxRoleId),
            },
          })
          .catch((error) => {
            console.error(
              `[update-group] Failed to update rank for user ${user.userid}:`,
              error
            );
          });
        for (const userRole of user.roles) {
          if (userRole.isOwnerRole) {
            continue;
          }

          if (userRole.groupRoles === null || userRole.groupRoles === undefined) {
            continue;
          }

          if (userRole.groupRoles.length === 0) {
            console.log(
              `[update-group] Removing role "${userRole.name}" from user ${user.userid}.`
            );
            
            await prisma.user
              .update({
                where: { userid: user.userid },
                data: { roles: { disconnect: { id: userRole.id } } },
              })
              .catch((error) => {
                console.error(
                  `[update-group] Failed to remove role ${userRole.id} from user ${user.userid}:`,
                  error
                );
              });
            continue;
          }

          const groupRoleIds = userRole.groupRoles.map((id: any) => Number(id));
          const hasQualifyingRank = groupRoleIds.includes(currentRobloxRoleId);
          
          if (!hasQualifyingRank) {
            console.log(
              `[update-group] Removing role "${userRole.name}" from user ${user.userid} - no longer has qualifying rank (current role ID: ${currentRobloxRoleId}, required: [${groupRoleIds.join(", ")}])`
            );
            
            await prisma.user
              .update({
                where: { userid: user.userid },
                data: { roles: { disconnect: { id: userRole.id } } },
              })
              .catch((error) => {
                console.error(
                  `[update-group] Failed to remove role ${userRole.id} from user ${user.userid}:`,
                  error
                );
              });
          }
        }
      }

      console.log(`[update-group] Completed role cleanup for group ${groupID}`);
    } catch (error) {
      console.error(
        `[update-group] Error during role cleanup for group ${groupID}:`,
        error
      );
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
