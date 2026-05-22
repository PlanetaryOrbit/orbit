import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "PATCH" && req.method !== "DELETE") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { id, did } = req.query;

  const workspaceId = Number.parseInt(id as string);
  if (!workspaceId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  }

  const departmentIdString = Array.isArray(did) ? did[0] : did;
  if (!departmentIdString) {
    return res
      .status(400)
      .json({ success: false, error: "Missing department ID" });
  }

  if (req.method === "GET") {
    try {
      const department = await prisma.department.findFirst({
        where: {
          workspaceGroupId: workspaceId,
          id: departmentIdString
        },
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!department) {
        return res.status(404).json({ success: false, error: "Department not found" });
      }

      const formattedResponse = {
        name: department.name,
        id: department.id,
        color: department.color,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      };

      return res.status(200).json({ success: true, data: formattedResponse });
    } catch (error) {
      console.error("Error fetching department:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "PATCH") {
    const { name, color } = req.body;

    try {
      const existingDepartment = await prisma.department.findFirst({
        where: {
          workspaceGroupId: workspaceId,
          id: departmentIdString
        }
      });

      if (!existingDepartment) {
        return res.status(404).json({ success: false, error: "Department not found" });
      }

      if (name && name !== existingDepartment.name) {
        const nameConflict = await prisma.department.findFirst({
          where: {
            workspaceGroupId: workspaceId,
            name: name,
            NOT: {
              id: departmentIdString
            }
          }
        });

        if (nameConflict) {
          return res.status(409).json({
            success: false,
            error: "A department with this name already exists in this workspace"
          });
        }
      }

      const updatedDepartment = await prisma.department.update({
        where: {
          id: departmentIdString
        },
        data: {
          ...(name && { name }),
          ...(color !== undefined && { color: color || null }),
        }
      });
      
      return res.status(200).json({ success: true, data: updatedDepartment });
    } catch (error) {
      console.error("Error updating department:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const existingDepartment = await prisma.department.findFirst({
        where: {
          workspaceGroupId: workspaceId,
          id: departmentIdString
        }
      });

      if (!existingDepartment) {
        return res.status(404).json({ success: false, error: "Department not found" });
      }


      await prisma.department.delete({
        where: {
          id: departmentIdString
        }
      });
      
      return res.status(200).json({ success: true, message: "Department deleted successfully" });
    } catch (error) {
      console.error("Error deleting department:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }
}