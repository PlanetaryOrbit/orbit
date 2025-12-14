import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

const roleAssignmentLimits: { [key: string]: { count: number; resetTime: number } } = {};
function checkRoleAssignmentRateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
  const workspaceId = req.query?.id || 'unknown';
  const userId = (req as any).session?.userid || 'anonymous';
  const key = `workspace:${workspaceId}:user:${userId}`;
  const now = Date.now();
  const windowMs = 2 * 1000;
  const maxRequests = 10;

  let entry = roleAssignmentLimits[key];
  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    roleAssignmentLimits[key] = entry;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Too many role assignment requests. Slow down!'
    });
    return false;
  }
  return true;
}

type Data = {
  success: boolean;
  error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (!checkRoleAssignmentRateLimit(req, res)) return;
  
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { sid } = req.query;
  const { userId, roleId, slot, action } = req.body;
  const currentUserId = (req as any).session?.userid;

  if (!sid || !roleId || slot === undefined || !action) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required parameters" });
  }

  if (action !== "claim" && action !== "unclaim") {
    return res
      .status(400)
      .json({
        success: false,
        error: 'Invalid action. Must be "claim" or "unclaim"',
      });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid as string },
      include: {
        users: true,
        sessionType: true,
      },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }
    const currentUser = await prisma.user.findFirst({
      where: { userid: BigInt(currentUserId) },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(req.query.id as string),
          },
        },
      },
    });

    if (!currentUser || !currentUser.roles[0]) {
      return res.status(403).json({ 
        success: false, 
        error: "You do not have permission to perform this action" 
      });
    }

    const userPermissions = currentUser.roles[0].permissions;
    const hasAssignPermission = userPermissions.includes("sessions_assign") || userPermissions.includes("admin"); 
    const hasClaimPermission = userPermissions.includes("sessions_claim") || userPermissions.includes("admin")
    const hasHostPermission = userPermissions.includes("sessions_host") || userPermissions.includes("admin")
    const isAssigningToSelf = userId && userId.toString() === currentUserId.toString();

    if (action === "unclaim") {
      const existingAssignment = await prisma.sessionUser.findFirst({
        where: {
          sessionid: sid as string,
          roleID: roleId,
          slot: slot,
        },
      });

      const isRemovingSelf = existingAssignment && existingAssignment.userid.toString() === currentUserId.toString();
      if (!hasAssignPermission && !((hasClaimPermission || hasHostPermission) && isRemovingSelf)) {
        return res.status(403).json({ 
          success: false, 
          error: "You do not have permission to remove this role" 
        });
      }
    } else if (action === "claim") {
      if (!hasAssignPermission && !((hasClaimPermission || hasHostPermission) && isAssigningToSelf)) {
        return res.status(403).json({ 
          success: false, 
          error: "You do not have permission to assign this role" 
        });
      }
    }

    console.log(
      `Role ${action} attempt: session=${sid}, roleId=${roleId}, slot=${slot}, userId=${userId}`
    );

    if (action === "claim") {
      if (!userId) {
        return res
          .status(400)
          .json({
            success: false,
            error: "userId is required for claim action",
          });
      }

      const targetUser = await prisma.user.findFirst({
        where: { userid: BigInt(userId) },
        include: {
          roles: {
            where: {
              workspaceGroupId: parseInt(req.query.id as string),
            },
          },
        },
      });

      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const existingClaim = await prisma.sessionUser.findFirst({
        where: {
          sessionid: sid as string,
          roleID: roleId,
          slot: slot,
        },
      });

      if (existingClaim && existingClaim.userid.toString() !== userId) {
        return res
          .status(400)
          .json({
            success: false,
            error: "This slot is already claimed by another user",
          });
      }

      await prisma.sessionUser.deleteMany({
        where: {
          userid: BigInt(userId),
          sessionid: sid as string,
        },
      });

      const result = await prisma.sessionUser.create({
        data: {
          userid: BigInt(userId),
          sessionid: sid as string,
          roleID: roleId,
          slot: slot,
        },
      });
    } else {
      const result = await prisma.sessionUser.deleteMany({
        where: {
          sessionid: sid as string,
          roleID: roleId,
          slot: slot,
        },
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error managing role claim:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default withPermissionCheck(handler);
