import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

const roleAssignmentLimits: { [key: string]: { count: number; resetTime: number } } = {};
function checkRoleAssignmentRateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
  const workspaceId = req.query?.id || 'unknown';
  const userId = (req as any).session?.userid || 'anonymous';
  const key = `workspace:${workspaceId}:user:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 20;

  let entry = roleAssignmentLimits[key];
  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    roleAssignmentLimits[key] = entry;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Too many role assignment attempts. Please wait a moment before making more changes.'
    });
    return false;
  }
  return true;
}

type Data = {
  success: boolean;
  error?: string;
};

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (!checkRoleAssignmentRateLimit(req, res)) return;
  
  if (req.method !== "PUT") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { sid } = req.query;
  const { ownerId } = req.body;
  const currentUserId = (req as any).session?.userid;

  if (!sid) {
    return res
      .status(400)
      .json({ success: false, error: "Session ID is required" });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sid as string },
      include: {
        sessionType: true,
      },
    });

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Session not found" });
    }

    const sessionCategory = session.type?.toLowerCase() || 'other';
    const validTypes = ['shift', 'training', 'event', 'other'];
    const type = validTypes.includes(sessionCategory) ? sessionCategory : 'other';
    const currentUser = await prisma.user.findFirst({
      where: { userid: BigInt(currentUserId) },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(req.query.id as string),
          },
        },
        workspaceMemberships: {
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

    const membership = currentUser.workspaceMemberships[0];
    const isAdmin = membership?.isAdmin || false;
    const userPermissions = currentUser.roles[0].permissions;
    const hasAssignPermission = isAdmin || userPermissions.includes(`sessions_${type}_assign`);
    const hasHostPermission = isAdmin || userPermissions.includes(`sessions_${type}_host`);
    const isAssigningToSelf = ownerId && ownerId.toString() === currentUserId.toString();
    const isRemoving = !ownerId;
    const currentSession = await prisma.session.findUnique({
      where: { id: sid as string },
      select: { ownerId: true },
    });
    
    const isRemovingSelf = isRemoving && currentSession?.ownerId && currentSession.ownerId.toString() === currentUserId.toString();
    let canUpdateHost = false;
    if (isRemoving) {
      if (isRemovingSelf) {
        canUpdateHost = hasHostPermission;
      } else {
        canUpdateHost = hasAssignPermission && hasHostPermission;
      }
    } else {
      if (isAssigningToSelf) {
        canUpdateHost = hasHostPermission;
      } else {
        canUpdateHost = hasAssignPermission && hasHostPermission;
      }
    }
    
    if (!canUpdateHost) {
      return res.status(403).json({ 
        success: false, 
        error: "You do not have permission to assign this host role" 
      });
    }

    if (ownerId) {
      const targetUser = await prisma.user.findFirst({
        where: { userid: BigInt(ownerId) },
        include: {
          roles: {
            where: {
              workspaceGroupId: parseInt(req.query.id as string),
            },
          },
          workspaceMemberships: {
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
      if (hasHostPermission && !hasAssignPermission && !isAssigningToSelf) {
        const targetUserPermissions = targetUser.roles[0]?.permissions || [];
        const targetMembership = targetUser.workspaceMemberships?.[0];
        const targetIsAdmin = targetMembership?.isAdmin || false;
        const targetHasHostPermission = targetIsAdmin || targetUserPermissions.includes(`sessions_${type}_host`);
        if (!targetHasHostPermission) {
          return res.status(403).json({ 
            success: false, 
            error: "You can only assign host roles to users who have the host permission" 
          });
        }
      }
    }

    await prisma.session.update({
      where: { id: sid as string },
      data: {
        ownerId: ownerId ? BigInt(ownerId) : null,
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating session host:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default withPermissionCheck(handler);
