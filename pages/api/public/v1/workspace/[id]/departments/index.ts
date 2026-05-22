import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = Number.parseInt(req.query.id as string);
  if (!workspaceId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  }

  if (req.method === "GET") {
    try {
      const departments = await prisma.department.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
        select: {
          name: true,
          id: true,
          color: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const formattedResponse = departments.map((department) => ({
        name: department.name,
        id: department.id,
        color: department.color,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      }));

      return res.status(200).json({ success: true, data: formattedResponse });
    } catch (error) {
      console.error("Error fetching departments:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    const { name, color } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ 
        success: false, 
        error: "Role name is required and must be a string" 
      });
    }

    const existingDepartment = await prisma.department.findFirst({
      where: {
        workspaceGroupId: workspaceId,
        name: name
      }
    });

    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        error: "A department with this name already exists in this workspace"
      });
    }

    try {
      const newDepartment = await prisma.department.create({
        data: {
          name,
          color: color || null,
          workspaceGroupId: workspaceId,
        }
      });
      
      return res.status(201).json({ success: true, data: newDepartment });
    } catch (error) {
      console.error("Error creating department:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  }
}