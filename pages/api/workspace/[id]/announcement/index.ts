import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withSessionRoute } from "@/lib/withSession";

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
      subtitle: "Update: v2.1.10 is now live!",
  sections: [
    {
      title: "",
      content:
        "This one's a big one. From a full platform redesign to brand new features — here's a peek at what dropped this week.",
    },
    {
      title: "📱 Mobile bottom bar",
      content:
        "Navigation on mobile just got a whole lot better. A new bottom bar keeps everything within reach, right where your thumbs are.",
    },
    {
      title: "🛠️ Staff views on mobile",
      content:
        "Staff dashboards are now properly optimized for mobile devices — no more squinting or awkward scrolling.",
    },
    {
      title: "🎵 Music quotes",
      content:
        "We've introduced music quotes — a new way to share what you're listening to and spark conversations around it.",
    },
    {
      title: "✨ Platform redesign",
      content:
        "Planetary has had a major glow-up. Cleaner, faster, and more intuitive across the board.",
    },
    {
      title: "",
      content:
        "And honestly? There's a lot more we didn't mention — you'll just have to discover it yourself. 👀",
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
