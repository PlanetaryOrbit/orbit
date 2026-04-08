import { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

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

  if (!hasAdminPermission) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }

  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res
        .status(400)
        .json({ success: false, error: "Webhook URL is required" });
    }

    if (!url.match(/^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+/)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Discord webhook URL format",
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { groupId: workspaceId },
      select: { groupName: true },
    });

    const embed = {
      title: "This is a test",
      description: "This is a test of a discord logging function with Audit Logs!",
      color: 0xFF0099,
      fields: [
        {
          name: "Status",
          value: "✅ Webhook is configured correctly",
          inline: false,
        },
        {
          name: "Workspace",
          value: workspace?.groupName || "Unknown",
          inline: true,
        },
      ],
      footer: {
        text: "With all love from orbit team",
      },
      timestamp: new Date().toISOString(),
    };

    const webhookBody = {
      embeds: [embed],
      username: "Orbit",
      avatar_url: `http://cdn.planetaryapp.us/brand/planetary.png`,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord webhook error:", errorText);
      return res.status(400).json({
        success: false,
        error: `Discord webhook returned status ${response.status}`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error testing birthday webhook:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

export default withSessionRoute(handler);
