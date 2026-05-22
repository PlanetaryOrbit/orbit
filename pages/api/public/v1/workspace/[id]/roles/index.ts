import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";
import { permission } from "process";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const workspaceId = Number.parseInt(req.query.id as string);
  if (!workspaceId)
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });

  if (req.method == "GET") {
    try {
      const roles = await prisma.role.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
        select: {
          id: true,
          name: true,
          permissions: true,
          groupRoles: true,
          color: true,
          isOwnerRole: true,
          quotaRoles: {
            select: {
              quota: true,
              role: true,
            },
          },
        },
      });

      const formattedResponse = roles.map((role) => ({
        name: role.name,
        id: role.id,
        color: role.color,
        isOwnerRole: role.isOwnerRole,
        permissions: role.permissions,
        groupRoles: role.groupRoles,
        quota: role.quotaRoles.map((qr) => ({
          quota: qr.quota,
          role: qr.role,
        })),
      }));

      return res.status(200).json({ success: true, data: formattedResponse });
    } catch (error) {
      console.error("Error fetching roles:", error);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  } else if (req.method === "POST") {
    const { name, permissions, color } = req.body;
  }
}
