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
      subtitle: "Update: v2.1.7 is now live!",
      sections: [
        {
          title: "",
          content:
            "We're keeping this going with a well needed update. Here are a few highlights from this week's work and community feedback.",
        },
        {
          title: "📖 Sessions",
          content:
            "We have updated our session logic, so when editing recurring sessions you have the option to edit the one session or all the events in the series.",
        },
        {
          title: "👤 Profiles",
          content:
            "We have refreshed how all the staff profiles look and the information that shows up. You can now see activity quotas, session history, and activity overview all in one place! As well as new information like Timezone, Department etc!",
        },
        {
          title: "🎂 Birthdays",
          content:
            "We have added the ability for you to add a webhook which announced the birthdays of people on your workspace.",
        },
        {
          title: "",
          content:
            "That's a wrap for this week — we'll see you next Saturday for more updates from Team Planetary.",
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
