import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { v4 as uuidv4 } from "uuid";
import { SAVED_VIEW_NAME_MAX_LENGTH } from "@/utils/savedViewLimits";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";

async function hasManageViewsPermission(req: AuthenticatedRequest, workspaceId: number) {
  if (!req.session?.userid) return false;
  const user = await prisma.user.findFirst({
    where: { userid: BigInt(req.auth.userId) },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
      },
      workspaceMemberships: {
        where: { workspaceGroupId: workspaceId },
      },
    },
  });
  if (!user || !user.roles.length) return false;
  const role = user.roles[0];
  const membership = user.workspaceMemberships[0];
  const isAdmin = membership?.isAdmin || false;
  return isAdmin || (role.permissions || []).includes("create_views") || (role.permissions || []).includes("edit_views") || (role.permissions || []).includes("delete_views");
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const workspaceId = Number(req.query.id as string);
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" });

  try {
    if (req.method === "GET") {
      const views = await prisma.savedView.findMany({ where: { workspaceGroupId: workspaceId }, orderBy: { createdAt: 'asc' } });
      return res.status(200).json({ success: true, views });
    }

    if (req.method === "POST") {
      if (!req.auth.userId) return res.status(401).json({ success: false, error: "Unauthorized" });
      const user = await prisma.user.findFirst({
        where: { userid: BigInt(req.auth.userId) },
        include: {
          roles: { where: { workspaceGroupId: workspaceId } },
          workspaceMemberships: { where: { workspaceGroupId: workspaceId } },
        },
      });
      if (!user || !user.roles.length) return res.status(401).json({ success: false, error: "Unauthorized" });
      const membership = user.workspaceMemberships[0];
      const isAdmin = membership?.isAdmin || false;
      const hasCreatePermission = isAdmin || user.roles[0].permissions.includes("create_views");
      if (!hasCreatePermission) return res.status(401).json({ success: false, error: "Unauthorized" });

      const { name, color, icon, filters, columnVisibility } = req.body;
      const nameStr =
        typeof name === "string" ? name.trim() : String(name ?? "").trim();
      if (!nameStr) return res.status(400).json({ success: false, error: "Missing name" });
      if (nameStr.length > SAVED_VIEW_NAME_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Name must be at most ${SAVED_VIEW_NAME_MAX_LENGTH} characters`,
        });
      }

      const newView = await prisma.savedView.create({
        data: {
          id: uuidv4(),
          workspaceGroupId: workspaceId,
          name: nameStr,
          color: color || null,
          icon: icon || null,
          filters: filters || [],
          columnVisibility: columnVisibility || {},
        },
      });

      return res.status(201).json({ success: true, view: newView });
    }

    return res.status(405).json({ success: false, error: "Method not allowed" });
  } catch (e) {
    console.error("Saved views API error:", e);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default withAuth(handler);
