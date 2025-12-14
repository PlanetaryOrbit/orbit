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

  // Check if user has admin permission
  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
        orderBy: { isOwnerRole: "desc" },
      },
    },
  });

  const userRole = user?.roles?.[0];
  const hasAdminPermission =
    userRole?.permissions?.includes("admin") || userRole?.isOwnerRole;

  if (req.method === "GET") {
    try {
      const config = await getConfig("birthday_webhook", workspaceId);
      return res.status(200).json({
        success: true,
        value: config || { enabled: false, url: "" },
      });
    } catch (error) {
      console.error("Error fetching birthday webhook config:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }

  if (req.method === "PATCH") {
    if (!hasAdminPermission) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    try {
      const { enabled, url } = req.body;

      if (typeof enabled !== "boolean") {
        return res.status(400).json({ success: false, error: "Invalid enabled value" });
      }

      if (enabled && (!url || typeof url !== "string")) {
        return res.status(400).json({ success: false, error: "Webhook URL is required when enabled" });
      }

      if (enabled && url && !url.match(/^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+/)) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid Discord webhook URL format" 
        });
      }

      await setConfig("birthday_webhook", {
        enabled,
        url: url || "",
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
