import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";
import packageinfo from '@/package.json'

type Data = {
  success: boolean;
  error?: string;
  announcement?: any;
  canEdit?: boolean;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  const userId = req.session.userid;

  if (!userId || !workspaceId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const currentUser = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
      },
    });

    if (!currentUser) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const membership = currentUser.workspaceMemberships[0];
    const isAdmin = membership?.isAdmin || false;
    const userRole = currentUser.roles[0];
    const canEdit =
      isAdmin ||
      (userRole?.permissions?.includes("edit_sticky_post") ?? false);

    const announcement = await prisma.stickyAnnouncement.findUnique({
      where: {
        workspaceGroupId: workspaceId,
      },
    });

    const defaultAnnouncement = {
      title: "Planetary",
      subtitle: `Update: v${packageinfo.version} is now live!`,
      sections: [
        {
          title: "",
          content:
            "Another week, another drop. Here's what's new — and trust us, there's plenty.",
        },
        {
          title: "💬 Feedback platform",
          content:
            "We launched our official feedback platform at feedback.planetaryapp.us — got a suggestion, bug report, or idea? Now there's a home for it.",
        },
        {
          title: "📋 Sessions board",
          content:
            "A brand new sessions board is here. Head to Settings > Integrations to get it set up and start managing sessions in a whole new way.",
        },
        {
          title: "📝 Resignation logs",
          content:
            "Resignations now leave a proper paper trail. Logs are tracked and accessible so nothing slips through the cracks.",
        },
        {
          title: "🏠 Home screen reorganisation",
          content:
            "The home screen has been tidied up and reorganised — things are where you'd expect them to be now.",
        },
        {
          title: "⚖️ Affiliate discipline",
          content:
            "You can now issue strikes, set strike limits, and action terminations for affiliates directly within Planetary.",
        },
        {
          title: "🔄 Workspace refresh",
          content:
            "Refresh icons have been added across workspaces — keeping your data up to date is now just one click away.",
        },
        {
          title: "",
          content:
            "And honestly? We've barely scratched the surface. There's a lot more in store — we'd rather you discover it yourself. 👀",
        },
      ],
      editorUsername: null,
      editorPicture: null,
      isDefault: true,
    };

    return res.status(200).json({
      success: true,
      announcement: announcement
        ? {
            ...announcement,
            editorId: announcement.editorId ? announcement.editorId.toString() : null,
            sections:
              typeof announcement.sections === "string"
                ? JSON.parse(announcement.sections)
                : announcement.sections,
            isDefault: false,
          }
        : defaultAnnouncement,
      canEdit,
    });
  } catch (error) {
    console.error("Error fetching announcement:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch announcement",
    });
  }
}

export default withSessionRoute(handler);
