// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { fetchworkspace, getConfig, setConfig } from "@/utils/configEngine";
import prisma, { SessionType, document } from "@/utils/database";
import { logAudit } from "@/utils/logs";
import { withSessionRoute } from "@/lib/withSession";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { RankGunAPI, getRankGun } from "@/utils/rankgun";

import {
  getUsername,
  getThumbnail,
  getDisplayName,
} from "@/utils/userinfoEngine";
import * as noblox from "noblox.js";
type Data = {
  success: boolean;
  error?: string;
  log?: any;
  terminated?: boolean;
};

async function checkPermissionForType(req: NextApiRequest, type: string, workspaceGroupId: number) {
  const permissionMap: Record<string, string> = {
    note: "logbook_note",
    warning: "logbook_warning",
    promotion: "logbook_promotion",
    demotion: "logbook_demotion",
    termination: "logbook_termination",
    rank_change: "logbook_promotion",
  };
  
  const requiredPermission = permissionMap[type];
  if (!requiredPermission) return false;
  
  const user = await prisma.user.findFirst({
    where: { userid: BigInt(req.session.userid) },
    include: {
      roles: { where: { workspaceGroupId } },
      workspaceMemberships: { where: { workspaceGroupId } },
    },
  });
  
  if (!user || !user.roles.length) return false;
  const membership = user.workspaceMemberships[0];
  const isAdmin = membership?.isAdmin || false;
  if (isAdmin) return true;
  
  return user.roles[0].permissions.includes(requiredPermission);
}

async function hasRankUsersPermission(req: NextApiRequest, workspaceGroupId: number): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { userid: BigInt(req.session.userid) },
    include: {
      roles: { where: { workspaceGroupId } },
      workspaceMemberships: { where: { workspaceGroupId } },
    },
  });
  
  if (!user) return false;
  const membership = user.workspaceMemberships[0];
  const isAdmin = membership?.isAdmin || false;
  if (isAdmin) return true;
  
  return user.roles.some(role => role.permissions.includes("rank_users"));
}

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  const { type, notes, targetRank } = req.body;
  if (!type || !notes)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  if (
    type !== "termination" &&
    type !== "warning" &&
    type !== "promotion" &&
    type !== "demotion" &&
    type !== "note" &&
    type !== "rank_change"
  )
    return res.status(400).json({ success: false, error: "Invalid type" });
  const { uid, id } = req.query;
  if (!uid)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  const workspaceGroupId = parseInt(id as string);
  const hasPermission = await checkPermissionForType(req, type, workspaceGroupId);
  if (!hasPermission) {
    return res.status(403).json({ success: false, error: "Insufficient permissions" });
  }
  const userId = parseInt(uid as string);

  if (BigInt(userId) === req.session.userid) {
    return res.status(400).json({
      success: false,
      error: "You cannot perform actions on yourself.",
    });
  }

  const rankGun = await getRankGun(workspaceGroupId);
  const canUseRankGun = await hasRankUsersPermission(req, workspaceGroupId);
  let rankBefore: number | null = null;
  let rankAfter: number | null = null;
  let rankNameBefore: string | null = null;
  let rankNameAfter: string | null = null;

  if (
    (rankGun && canUseRankGun) &&
    (type === "promotion" ||
      type === "demotion" ||
      type === "rank_change" ||
      type === "termination")
  ) {
    try {
      const targetUserRank = await prisma.rank.findFirst({
        where: {
          userId: BigInt(userId),
          workspaceGroupId: workspaceGroupId,
        },
      });

      if (targetUserRank) {
        rankBefore = Number(targetUserRank.rankId);
        const currentRankInfo = await noblox.getRole(
          workspaceGroupId,
          rankBefore
        );
        rankNameBefore = currentRankInfo?.name || null;
      }

      const adminUserRank = await prisma.rank.findFirst({
        where: {
          userId: BigInt(req.session.userid),
          workspaceGroupId: workspaceGroupId,
        },
      });

      if (adminUserRank) {
        const adminRank = Number(adminUserRank.rankId);
        if (rankBefore && rankBefore >= adminRank) {
          const adminUser = await prisma.user.findFirst({
            where: {
              userid: BigInt(req.session.userid),
            },
            include: {
              workspaceMemberships: {
                where: {
                  workspaceGroupId: workspaceGroupId,
                },
              },
            },
          });

          const adminMembership = adminUser?.workspaceMemberships[0];
          const isAdmin = adminMembership?.isAdmin || false;
          if (!isAdmin) {
            return res.status(403).json({
              success: false,
              error:
                "You cannot perform ranking actions on users with equal or higher rank than yours",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error getting current rank:", error);
    }
  }

  if (
    rankGun &&
    canUseRankGun &&
    (type === "promotion" ||
      type === "demotion" ||
      type === "rank_change" ||
      type === "termination")
  ) {
    const rankGunAPI = rankGun ? new RankGunAPI(rankGun) : null;
    let result;

    try {
      switch (type) {
        case "promotion":
          if (rankGunAPI) {
            result = await rankGunAPI.promoteUser(userId, rankGun.workspaceId);
          }
          break;
        case "demotion":
          if (rankGunAPI) {
            result = await rankGunAPI.demoteUser(userId, rankGun.workspaceId);
          }
          break;
        case "termination":
          if (rankGunAPI) {
            result = await rankGunAPI.terminateUser(userId, rankGun.workspaceId);
          }
          break;
        case "rank_change":
          if (!targetRank || isNaN(targetRank)) {
            return res.status(400).json({
              success: false,
              error: "Target rank is required for rank change.",
            });
          }
          try {
            const adminUserRank = await prisma.rank.findFirst({
              where: {
                userId: BigInt(req.session.userid),
                workspaceGroupId: workspaceGroupId,
              },
            });

            if (adminUserRank) {
              const adminRank = Number(adminUserRank.rankId);

              if (parseInt(targetRank) >= adminRank) {
                const adminUser = await prisma.user.findFirst({
                  where: {
                    userid: BigInt(req.session.userid),
                  },
                  include: {
                    workspaceMemberships: {
                      where: {
                        workspaceGroupId: workspaceGroupId,
                      },
                    },
                  },
                });

                const adminMembership = adminUser?.workspaceMemberships[0];
                const isAdmin = adminMembership?.isAdmin || false;
                if (!isAdmin) {
                  return res.status(403).json({
                    success: false,
                    error:
                      "You cannot set users to a rank equal to or higher than your own.",
                  });
                }
              }
            }
          } catch (rankCheckError) {
            console.error(
              "Error checking admin rank for rank_change:",
              rankCheckError
            );
          }

          if (rankGunAPI) {
            result = await rankGunAPI.setUserRank(
              userId,
              rankGun.workspaceId,
              parseInt(targetRank)
            );
          }
          break;
      }

      if (result && !result.success) {
        // Log the full result for debugging so we can see RankGun's response shape
        console.error("RankGun returned an error result:", result);
        let errorMessage = result.error || "Ranking operation failed.";
        if (typeof errorMessage === "object") {
          try {
            errorMessage = JSON.stringify(errorMessage);
          } catch (e) {
            errorMessage = String(errorMessage);
          }
        }
        return res.status(400).json({
          success: false,
          error: String(errorMessage),
        });
      }

      if (type === "termination" && result?.success) {
        try {
          if (BigInt(userId) === req.session.userid) {
            return res.status(400).json({
              success: false,
              error: "You cannot terminate yourself.",
            });
          }

          const currentUser = await prisma.user.findFirst({
            where: {
              userid: BigInt(userId),
            },
            include: {
              roles: {
                where: {
                  workspaceGroupId: workspaceGroupId,
                },
              },
            },
          });

          if (currentUser && currentUser.roles.length > 0) {
            for (const role of currentUser.roles) {
              await prisma.user.update({
                where: {
                  userid: BigInt(userId),
                },
                data: {
                  roles: {
                    disconnect: {
                      id: role.id,
                    },
                  },
                },
              });
            }
          }

          await prisma.rank.deleteMany({
            where: {
              userId: BigInt(userId),
              workspaceGroupId: workspaceGroupId,
            },
          });

          const userbook = await prisma.userBook.create({
            data: {
              userId: BigInt(userId),
              type,
              workspaceGroupId: workspaceGroupId,
              reason: notes,
              adminId: BigInt(req.session.userid),
              rankBefore,
              rankAfter: 1,
              rankNameBefore,
              rankNameAfter,
            },
            include: {
              admin: true,
            },
          });

          try {
            await logAudit(
              workspaceGroupId,
              req.session.userid || null,
              "userbook.create",
              `userbook:${userbook.id}`,
              {
                type,
                userId,
                adminId: req.session.userid,
                rankBefore,
                rankAfter: 1,
                rankNameBefore,
                rankNameAfter,
              }
            );
          } catch (e) {}

          return res.status(200).json({
            success: true,
            log: JSON.parse(
              JSON.stringify(userbook, (key, value) =>
                typeof value === "bigint" ? value.toString() : value
              )
            ),
            terminated: true,
          });
        } catch (terminationError) {
          return res.status(500).json({
            success: false,
            error: "Failed to remove user from workspace",
          });
        }
      }

      try {
        const newRank = await noblox.getRankInGroup(workspaceGroupId, userId);
        rankAfter = newRank;
        const newRankInfo = await noblox.getRole(workspaceGroupId, newRank);
        rankNameAfter = newRankInfo?.name || null;

        await prisma.rank.upsert({
          where: {
            userId_workspaceGroupId: {
              userId: BigInt(userId),
              workspaceGroupId: workspaceGroupId,
            },
          },
          update: {
            rankId: BigInt(newRank),
          },
          create: {
            userId: BigInt(userId),
            workspaceGroupId: workspaceGroupId,
            rankId: BigInt(newRank),
          },
        });

        const rankInfo = await noblox.getRole(workspaceGroupId, newRank);
        if (rankInfo) {
          const role = await prisma.role.findFirst({
            where: {
              workspaceGroupId: workspaceGroupId,
              groupRoles: {
                hasSome: [rankInfo.id],
              },
            },
          });

          if (role) {
            const currentUser = await prisma.user.findFirst({
              where: {
                userid: BigInt(userId),
              },
              include: {
                roles: {
                  where: {
                    workspaceGroupId: workspaceGroupId,
                  },
                },
              },
            });

            if (currentUser && currentUser.roles.length > 0) {
              for (const oldRole of currentUser.roles) {
                await prisma.user.update({
                  where: {
                    userid: BigInt(userId),
                  },
                  data: {
                    roles: {
                      disconnect: {
                        id: oldRole.id,
                      },
                    },
                  },
                });
              }
            }

            await prisma.user.update({
              where: {
                userid: BigInt(userId),
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
        }
      } catch (rankUpdateError) {
        console.error("Error updating user rank in database:", rankUpdateError);
      }
    } catch (error: any) {
      let errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "RankGun operation failed";
      if (typeof errorMessage === "object") {
        try {
          errorMessage = JSON.stringify(errorMessage);
        } catch (e) {
          errorMessage = String(errorMessage);
        }
      }
      return res.status(500).json({
        success: false,
        error: String(errorMessage),
      });
    }
  }

  const userbook = await prisma.userBook.create({
    data: {
      userId: BigInt(uid as string),
      type,
      workspaceGroupId: parseInt(id as string),
      reason: notes,
      adminId: BigInt(req.session.userid),
      rankBefore,
      rankAfter,
      rankNameBefore,
      rankNameAfter,
    },
    include: {
      admin: true,
    },
  });

  try {
    await logAudit(
      parseInt(id as string),
      req.session.userid || null,
      "userbook.create",
      `userbook:${userbook.id}`,
      {
        type,
        userId: uid,
        adminId: req.session.userid,
        rankBefore,
        rankAfter,
        rankNameBefore,
        rankNameAfter,
      }
    );
  } catch (e) {}

  res.status(200).json({
    success: true,
    log: JSON.parse(
      JSON.stringify(userbook, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    ),
  });
}

export default withSessionRoute(handler);
