import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { id, roleId, userId } = req.query;

  if (!id || !roleId || !userId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID, role ID, or user ID" });
  }

  const workspaceId = Number.parseInt(id as string);
  if (isNaN(workspaceId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid workspace ID" });
  }

  const roleIdString = Array.isArray(roleId) ? roleId[0] : roleId;
  if (!roleIdString) {
    return res
      .status(400)
      .json({ success: false, error: "Missing role ID" });
  }

  const userIdBigInt = Array.isArray(userId) ? BigInt(userId[0]) : BigInt(userId as string);
  if (!userIdBigInt) {
    return res.status(400).json({ success: false, error: "Missing user ID" });
  }

  try {
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceGroupId_userId: {
          workspaceGroupId: workspaceId,
          userId: userIdBigInt
        }
      }
    });

    if (!workspaceMember) {
      return res.status(404).json({ success: false, error: "User is not a member of this workspace" });
    }

    if (req.method === "POST") {
      const role = await prisma.role.findFirst({
        where: {
          id: roleIdString,
          workspaceGroupId: workspaceId
        }
      });

      if (!role) {
        return res.status(404).json({ success: false, error: "Role not found in this workspace" });
      }

      const existingRoleMember = await prisma.roleMember.findUnique({
        where: {
          roleId_userId: {
            roleId: roleIdString,
            userId: userIdBigInt
          }
        }
      });

      if (existingRoleMember) {
        return res.status(409).json({ success: false, error: "User already has this role" });
      }

      const roleMember = await prisma.roleMember.create({
        data: {
          roleId: roleIdString,
          userId: userIdBigInt,
          manuallyAdded: true
        },
        include: {
          role: true,
          user: true
        }
      });

      return res.status(201).json({ 
        success: true, 
        data: {
          roleId: roleMember.roleId,
          userId: roleMember.userId,
          roleName: roleMember.role.name,
          userName: roleMember.user.username,
          manuallyAdded: roleMember.manuallyAdded,
          createdAt: roleMember.createdAt
        }
      });
    }

    if (req.method === "DELETE") {
      const existingRoleMember = await prisma.roleMember.findUnique({
        where: {
          roleId_userId: {
            roleId: roleIdString,
            userId: userIdBigInt
          }
        }
      });

      if (!existingRoleMember) {
        return res.status(404).json({ success: false, error: "User does not have this role" });
      }

      await prisma.roleMember.delete({
        where: {
          roleId_userId: {
            roleId: roleIdString,
            userId: userIdBigInt
          }
        }
      });

      return res.status(200).json({ 
        success: true, 
        message: "User removed from role successfully" 
      });
    }

  } catch (error) {
    console.error("Error managing role member:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}