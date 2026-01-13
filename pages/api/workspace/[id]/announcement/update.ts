import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";

type Data = {
  success: boolean;
  error?: string;
  announcement?: any;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  const userId = req.session.userid;
  const { title, subtitle, sections } = req.body;

  if (!userId || !workspaceId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (!title || !sections || !Array.isArray(sections)) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: title and sections",
    });
  }

  try {
    const userInfo = await prisma.user.findUnique({
      where: { userid: BigInt(userId) },
      select: {
        username: true,
        picture: true,
      },
    });

    const announcement = await prisma.stickyAnnouncement.upsert({
      where: {
        workspaceGroupId: workspaceId,
      },
      update: {
        title,
        subtitle: subtitle || null,
        sections: sections,
        editorId: BigInt(userId),
        editorUsername: userInfo?.username || null,
        editorPicture: userInfo?.picture || null,
        updatedAt: new Date(),
      },
      create: {
        workspaceGroupId: workspaceId,
        title,
        subtitle: subtitle || null,
        sections: sections,
        editorId: BigInt(userId),
        editorUsername: userInfo?.username || null,
        editorPicture: userInfo?.picture || null,
      },
    });

    await logAudit(
      workspaceId,
      userId,
      "update_announcement",
      JSON.stringify({
        title,
        subtitle,
        sectionCount: sections.length,
      })
    );

    return res.status(200).json({
      success: true,
      announcement: {
        ...announcement,
        editorId: announcement.editorId ? announcement.editorId.toString() : null,
        sections:
          typeof announcement.sections === "string"
            ? JSON.parse(announcement.sections)
            : announcement.sections,
      },
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update announcement",
    });
  }
}

export default withPermissionCheck(handler, "edit_sticky_post");
