import { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import { getConfig, setConfig } from "@/utils/configEngine";
import prisma from "@/utils/database";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceId = parseInt(req.query.id as string);
  const userId = req.session.userid;

  if (!userId || isNaN(workspaceId)) {
    return res.status(400).json({ success: false, error: "Invalid request" });
  }

  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
      },
      workspaceMemberships: {
        where: { workspaceGroupId: workspaceId },
      },
    },
  });

  const membership = user?.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const userRole = user?.roles?.[0];
  const hasAdminPermission =
    userRole?.permissions?.includes("admin") || isAdmin;

  if (req.method === "GET") {
    try {
      const config = await getConfig("roblox_opencloud", workspaceId);
      return res.status(200).json({
        success: true,
        value: config || { enabled: false, key: "" },
      });
    } catch (error) {
      console.error("Error fetching OpenCloud config:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "PATCH") {
    if (!hasAdminPermission) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    try {
      const { enabled, key } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ success: false, error: "Invalid enabled value" });
      }

      if (enabled && (!key || typeof key !== "string")) {
        return res.status(400).json({ success: false, error: "OpenCloud key is required when enabled" });
      }

      await setConfig("roblox_opencloud", {
        enabled,
        key: key || "",
      }, workspaceId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating birthday webhook config:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}

export default withSessionRoute(handler);
