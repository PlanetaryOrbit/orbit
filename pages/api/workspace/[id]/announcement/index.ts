import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import packageinfo from '@/package.json'

type Data = {
  success: boolean;
  error?: string;
  announcement?: any;
  canEdit?: boolean;
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  const userId = req.auth.userId;

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
      title: "📚 Documentation rework",
      content:
        "We’ve completely reworked our documentation. Everything is clearer, faster, and easier to navigate. Check it out at https://docs.planetaryapp.us/",
    },
    {
      title: "🔧 Backend improvements",
      content:
        "We’ve pushed a wave of backend fixes and stability improvements. Things should feel smoother, faster, and more reliable overall ✨",
    },
    {
      title: "👤 Your profile, your control",
      content:
        "You can now view and edit your own profile — including birthday, timezone, and more personal settings. It’s your space, make it yours.",
    },
    {
      title: "🎨 UI rework",
      content:
        "We’ve reworked large parts of the UI with a cleaner, more modern feel. Go explore it — we think you’ll enjoy what the Planetary Team has been cooking up 👀",
    },
    {
      title: "🧑‍💻 User profile system overhaul",
      content:
        "User profiles have been fully migrated to our new internal user API. This makes everything more stable and sets the foundation for future features.",
    },
    {
      title: "",
      content:
        "That’s not even everything. Go poke around and see what else has changed — we’d rather let you discover it yourself 😉",
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

export default withAuth(handler);
