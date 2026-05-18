// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig } from "@/utils/configEngine";
import prisma from "@/utils/database";
import * as rbx from '@/utils/roblox'
import { logAudit } from "@/utils/logs";
import { RankGunAPI, getRankGun } from "@/utils/rankgun";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";

import * as noblox from "noblox.js";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";

type RankingResultLike = {
  success: boolean;
  error?: unknown;
  message?: unknown;
};

function rankingFailureMessage(result: RankingResultLike): string {
  let msg: unknown =
    result.error ??
    ("message" in result ? result.message : undefined) ??
    "Ranking operation failed.";
  if (typeof msg === "object") {
    try {
      msg = JSON.stringify(msg);
    } catch {
      msg = String(msg);
    }
  }
  return String(msg);
}

async function syncWorkspaceMemberRankFromRobloxNoblox(
  workspaceGroupId: number,
  userId: number
): Promise<{ rankAfter: number; rankNameAfter: string | null } | null> {
  try {
    const ocConf = await getConfig("roblox_opencloud", workspaceGroupId);
    const newRank = await rbx.getUserRank(
      BigInt(userId),
      BigInt(workspaceGroupId),
      ocConf.key
    );

    if (!newRank) {
      await prisma.rank.deleteMany({
        where: {
          userId: BigInt(userId),
          workspaceGroupId,
        },
      });

      const currentUser = await prisma.user.findFirst({
        where: { userid: BigInt(userId) },
        include: {
          roles: {
            where: { workspaceGroupId },
          },
        },
      });

      if (currentUser?.roles?.length) {
        await prisma.user.update({
          where: { userid: BigInt(userId) },
          data: {
            roles: {
              disconnect: currentUser.roles.map((r) => ({ id: r.id })),
            },
          },
        });
      }

      return {
        rankAfter: 0,
        rankNameAfter: "Guest",
      };
    }

    const rankValue = Number(newRank.rank);
    const rankNameAfter = newRank.roleName || null;

    await prisma.rank.upsert({
      where: {
        userId_workspaceGroupId: {
          userId: BigInt(userId),
          workspaceGroupId,
        },
      },
      update: {
        rankId: BigInt(rankValue),
      },
      create: {
        userId: BigInt(userId),
        workspaceGroupId,
        rankId: BigInt(rankValue),
      },
    });

    const rankInfo = await noblox.getRole(workspaceGroupId, rankValue);

    if (rankInfo) {
      const role = await prisma.role.findFirst({
        where: {
          workspaceGroupId,
          groupRoles: {
            hasSome: [BigInt(rankInfo.id)],
          },
        },
      });

      if (role) {
        const currentUser = await prisma.user.findFirst({
          where: { userid: BigInt(userId) },
          include: {
            roles: {
              where: { workspaceGroupId },
            },
          },
        });

        if (currentUser?.roles?.length) {
          await prisma.user.update({
            where: { userid: BigInt(userId) },
            data: {
              roles: {
                disconnect: currentUser.roles.map((r) => ({ id: r.id })),
              },
            },
          });
        }

        await prisma.user.update({
          where: { userid: BigInt(userId) },
          data: {
            roles: {
              connect: { id: role.id },
            },
          },
        });
      }
    }

    return {
      rankAfter: rankValue,
      rankNameAfter,
    };

  } catch (rankUpdateError) {
    console.error(
      "Error updating user rank in database:",
      rankUpdateError
    );
    return null;
  }
}

type Data = {
  success: boolean;
  error?: string;
  log?: any;
  terminated?: boolean;
};

type ParsedBody = {
  type?: string;
  notes?: string;
  targetRank?: string;
  attachments: {
    name: string;
    mime: string;
    size: number;
    dataUrl: string;
  }[];
};

const ALLOWED_ATTACHMENT_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function parseRequestBody(req: NextApiRequest): Promise<ParsedBody> {
  const contentType = req.headers["content-type"] || "";

  if (!contentType.includes("multipart/form-data")) {
    return {
      type: req.body?.type,
      notes: req.body?.notes,
      targetRank: req.body?.targetRank,
      attachments: [],
    };
  }

  const form = formidable({
    multiples: true,
    allowEmptyFiles: false,
    maxFileSize: MAX_ATTACHMENT_SIZE,
    maxFiles: MAX_ATTACHMENTS,
    filter: ({ mimetype }) => !!(mimetype && ALLOWED_ATTACHMENT_MIMES.has(mimetype)),
  });

  const [fields, files] = await form.parse(req);
  const rawType = Array.isArray(fields.type) ? fields.type[0] : fields.type;
  const rawNotes = Array.isArray(fields.notes) ? fields.notes[0] : fields.notes;
  const rawTargetRank = Array.isArray(fields.targetRank)
    ? fields.targetRank[0]
    : fields.targetRank;

  const parsedFiles = files.attachments
    ? (Array.isArray(files.attachments) ? files.attachments : [files.attachments])
    : [];

  if (parsedFiles.length > MAX_ATTACHMENTS) {
    throw new Error(`You can upload up to ${MAX_ATTACHMENTS} files.`);
  }

  const attachments: ParsedBody["attachments"] = [];
  for (const file of parsedFiles as FormidableFile[]) {
    const mime = file.mimetype || "";
    if (!ALLOWED_ATTACHMENT_MIMES.has(mime)) {
      throw new Error("Only PDF, JPG, PNG, WEBP, and GIF files are supported.");
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`Each file must be under ${MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB.`);
    }

    const buffer = fs.readFileSync(file.filepath);
    fs.unlinkSync(file.filepath);

    attachments.push({
      name: file.originalFilename || "attachment",
      mime,
      size: file.size,
      dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
    });
  }

  return {
    type: rawType,
    notes: rawNotes,
    targetRank: rawTargetRank,
    attachments,
  };
}

async function checkPermissionForType(req: AuthenticatedRequest, type: string, workspaceGroupId: number) {
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
    where: { userid: BigInt(req.auth.userId) },
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

async function hasRankUsersPermission(req: AuthenticatedRequest, workspaceGroupId: number): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { userid: BigInt(req.auth.userId) },
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

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  let parsedBody: ParsedBody;
  try {
    parsedBody = await parseRequestBody(req);
  } catch (e: any) {
    return res.status(400).json({
      success: false,
      error: e?.message || "Invalid upload payload",
    });
  }

  const { type, notes, targetRank, attachments } = parsedBody;
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

  if (BigInt(userId) === req.auth.userId) {
    return res.status(400).json({
      success: false,
      error: "You cannot perform actions on yourself.",
    });
  }
  const opencloudKey = await getConfig("roblox_opencloud", workspaceGroupId);
  const configOpenCloudApiKey =
    opencloudKey &&
      typeof (opencloudKey as { key?: string }).key === "string" &&
      (opencloudKey as { key: string }).key.length > 0
      ? (opencloudKey as { key: string }).key
      : null;
  const externalRanking = await prisma.workspaceExternalServices.findFirst({
    where: { workspaceGroupId },
  });
  const integratedRankingKey =
    externalRanking?.rankingProvider === "opencloudranking" &&
      typeof externalRanking?.rankingToken === "string" &&
      externalRanking.rankingToken.length > 0
      ? externalRanking.rankingToken
      : null;
  const promotionRankCap =
    typeof externalRanking?.rankingMaxRank === "number" &&
      externalRanking.rankingMaxRank >= 1
      ? externalRanking.rankingMaxRank
      : null;
  const rankingRobloxApiKey =
    integratedRankingKey ??
    ((externalRanking?.rankingProvider || "") !== "opencloudranking"
      ? configOpenCloudApiKey
      : null);
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
          userId: BigInt(req.auth.userId),
          workspaceGroupId: workspaceGroupId,
        },
      });

      if (adminUserRank) {
        const adminRank = Number(adminUserRank.rankId);
        if (rankBefore && rankBefore >= adminRank) {
          const adminUser = await prisma.user.findFirst({
            where: {
              userid: BigInt(req.auth.userId),
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
    ((rankGun && canUseRankGun) || rankingRobloxApiKey) &&
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
          if (rankGunAPI && rankGun) {
            result = await rankGunAPI.promoteUser(userId, rankGun.workspaceId);
          } else if (rankingRobloxApiKey) {
            result = await rbx.promoteUser(userId, workspaceGroupId, rankingRobloxApiKey, {
              maxPromotionRank: promotionRankCap,
            });
          } else {
            return res.status(400).json({
              success: false,
              error: "No ranking provider configured."
            });
          }
          break;
        case "demotion":
          if (rankGunAPI && rankGun) {
            result = await rankGunAPI.demoteUser(userId, rankGun.workspaceId);
          } else if (rankingRobloxApiKey) {
            result = await rbx.demoteUser(
              userId,
              workspaceGroupId,
              rankingRobloxApiKey
            );
          } else {
            return res.status(400).json({
              success: false,
              error: "No ranking provider configured."
            });
          }
          break;
        case "termination":
          if (rankGunAPI && rankGun) {
            result = await rankGunAPI.terminateUser(userId, rankGun.workspaceId);
          } else if (rankingRobloxApiKey) {
            result = await rbx.terminateUser(
              userId,
              workspaceGroupId,
              rankingRobloxApiKey
            );
          } else {
            return res.status(400).json({
              success: false,
              error: "No ranking provider configured."
            });
          }
          break;
        case "rank_change":
          const parsedTargetRank = Number(targetRank);
          if (!targetRank || Number.isNaN(parsedTargetRank)) {
            return res.status(400).json({
              success: false,
              error: "Target rank is required for rank change.",
            });
          }
          try {
            const adminUserRank = await prisma.rank.findFirst({
              where: {
                userId: BigInt(req.auth.userId),
                workspaceGroupId: workspaceGroupId,
              },
            });

            if (adminUserRank) {
              const adminRank = Number(adminUserRank.rankId);

              if (parsedTargetRank >= adminRank) {
                const adminUser = await prisma.user.findFirst({
                  where: {
                    userid: BigInt(req.auth.userId),
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
              rankGun ? rankGun.workspaceId : "",
              parsedTargetRank
            );
          } else if (rankingRobloxApiKey) {
            result = await rbx.rankChange(
              userId,
              workspaceGroupId,
              parsedTargetRank,
              rankingRobloxApiKey,
              { maxPromotionRank: promotionRankCap }
            );
          } else {
            return res.status(400).json({
              success: false,
              error: "No ranking provider configured."
            });
            break;
          }

          if (result && !result.success) {
            console.error("RankGun returned an error result:", result);
            let errorMessage =
              result.error ||
              (result as { message?: string }).message ||
              "Ranking operation failed.";
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

          const syncedRank = await syncWorkspaceMemberRankFromRobloxNoblox(
            workspaceGroupId,
            userId
          );
          if (syncedRank) {
            rankAfter = syncedRank.rankAfter;
            rankNameAfter = syncedRank.rankNameAfter;
          }
      }

      if (
        typeof result !== "undefined" &&
        result &&
        typeof result === "object" &&
        "success" in result &&
        (type === "promotion" ||
          type === "demotion" ||
          type === "termination")
      ) {
        const r = result as RankingResultLike;
        if (!r.success) {
          return res.status(400).json({
            success: false,
            error: rankingFailureMessage(r),
          });
        }
      }

      if (
        typeof result !== "undefined" &&
        result &&
        typeof result === "object" &&
        "success" in result &&
        (result as RankingResultLike).success &&
        (type === "promotion" || type === "demotion")
      ) {
        const synced = await syncWorkspaceMemberRankFromRobloxNoblox(
          workspaceGroupId,
          userId
        );
        if (synced) {
          rankAfter = synced.rankAfter;
          rankNameAfter = synced.rankNameAfter;
        }
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
      reason: JSON.stringify({
        text: notes,
        attachments,
      }),
      adminId: BigInt(req.auth.userId),
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
      req.auth.userId || null,
      "userbook.create",
      `userbook:${userbook.id}`,
      {
        type,
        userId: uid,
        adminId: req.auth.userId,
        rankBefore,
        rankAfter,
        rankNameBefore,
        rankNameAfter,
      }
    );
  } catch (e) { }

  res.status(200).json({
    success: true,
    log: JSON.parse(
      JSON.stringify(userbook, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    ),
  });
}

export default withAuth(handler);
