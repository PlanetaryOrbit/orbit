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

  const { id, did, userId } = req.query;

  if (!id || !did || !userId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID, department ID, or user ID" });
  }

  const workspaceId = Number.parseInt(id as string);
  if (isNaN(workspaceId)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid workspace ID" });
  }

  const departmentIdString = Array.isArray(did) ? did[0] : did;
  if (!departmentIdString) {
    return res
      .status(400)
      .json({ success: false, error: "Missing department ID" });
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
      const department = await prisma.department.findFirst({
        where: {
          id: departmentIdString,
          workspaceGroupId: workspaceId
        }
      });

      if (!department) {
        return res.status(404).json({ success: false, error: "Department not found in this workspace" });
      }

      const existingDepartmentMember = await prisma.departmentMember.findUnique({
        where: {
          departmentId_workspaceGroupId_userId: {
            departmentId: departmentIdString,
            workspaceGroupId: workspaceId,
            userId: userIdBigInt
          }
        }
      });

      if (existingDepartmentMember) {
        return res.status(409).json({ success: false, error: "User already belongs to this department" });
      }

      const departmentMember = await prisma.departmentMember.create({
        data: {
          departmentId: departmentIdString,
          workspaceGroupId: workspaceId,
          userId: userIdBigInt
        },
        include: {
          department: true,
          workspaceMember: {
            include: {
              user: true
            }
          }
        }
      });

      return res.status(201).json({ 
        success: true, 
        data: {
          departmentId: departmentMember.departmentId,
          workspaceGroupId: departmentMember.workspaceGroupId,
          userId: departmentMember.userId,
          departmentName: departmentMember.department.name,
          userName: departmentMember.workspaceMember.user.username,
          joinedAt: new Date().toISOString()
        }
      });
    }

    if (req.method === "DELETE") {
      const existingDepartmentMember = await prisma.departmentMember.findUnique({
        where: {
          departmentId_workspaceGroupId_userId: {
            departmentId: departmentIdString,
            workspaceGroupId: workspaceId,
            userId: userIdBigInt
          }
        }
      });

      if (!existingDepartmentMember) {
        return res.status(404).json({ success: false, error: "User does not belong to this department" });
      }

      await prisma.departmentMember.delete({
        where: {
          departmentId_workspaceGroupId_userId: {
            departmentId: departmentIdString,
            workspaceGroupId: workspaceId,
            userId: userIdBigInt
          }
        }
      });

      return res.status(200).json({ 
        success: true, 
        message: "User removed from department successfully" 
      });
    }

  } catch (error) {
    console.error("Error managing department member:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}