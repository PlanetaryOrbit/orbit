import { withPermissionCheck } from "@/utils/permissionsManager";
import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";

export default withPermissionCheck(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const { id } = req.query;
  const userId = req.session.userid;

  if (!userId)
    return res.status(401).json({ success: false, error: "Unauthorized" });

  const workspaceGroupId = parseInt(id as string);

  try {
    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId)
      },
      include: {
        roles: {
          where: {
            workspaceGroupId
          },
          select: {
            id: true
          }
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId
          },
          include: {
            departmentMembers: {
              include: {
                department: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const userRoleIds = user.roles ? user.roles.map(role => role.id) : [];
    const userDepartmentIds = user.workspaceMemberships?.[0]?.departmentMembers?.map(dm => dm.department.id) || [];

    const orConditions: any[] = [
      { roles: { none: {} }, departments: { none: {} } }
    ];

    if (userRoleIds.length > 0) {
      orConditions.push({
        roles: {
          some: {
            id: { in: userRoleIds }
          }
        }
      });
    }

    if (userDepartmentIds.length > 0) {
      orConditions.push({
        departments: {
          some: {
            id: { in: userDepartmentIds }
          }
        }
      });
    }

    const policies = await prisma.document.findMany({
      where: {
        workspaceGroupId,
        requiresAcknowledgment: true,
        OR: orConditions
      },
      select: {
        id: true,
        acknowledgments: {
          where: {
            userId: BigInt(userId),
          },
          select: {
            id: true,
          },
        },
      },
    });

    const pendingCount = policies.filter(
      (p) => p.acknowledgments.length === 0
    ).length;
    return res.status(200).json({ success: true, count: pendingCount });
  } catch (error) {
    console.error("Error fetching pending policy count:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});
