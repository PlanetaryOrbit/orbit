import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { v4 as uuidv4 } from "uuid";
import { withSessionRoute } from "@/lib/withSession";

async function hasManageViewsPermission(req: NextApiRequest, workspaceId: number) {
  if (!req.session?.userid) return false;
  const user = await prisma.user.findFirst({
    where: { userid: BigInt(req.session.userid) },
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
  return isAdmin || (role.permissions || []).includes("manage_views");
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceId = Number(req.query.id as string);
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" });

  try {
    if (req.method === "GET") {
      const views = await prisma.savedView.findMany({ where: { workspaceGroupId: workspaceId }, orderBy: { createdAt: 'asc' } });
      return res.status(200).json({ success: true, views });
    }

    if (req.method === "POST") {
      // require manage_views or owner
      const ok = await hasManageViewsPermission(req, workspaceId);
      if (!ok) return res.status(401).json({ success: false, error: "Unauthorized" });

      const { name, color, icon, filters, columnVisibility } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Missing name" });

      const newView = await prisma.savedView.create({
        data: {
          id: uuidv4(),
          workspaceGroupId: workspaceId,
          name,
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

export default withSessionRoute(handler);
