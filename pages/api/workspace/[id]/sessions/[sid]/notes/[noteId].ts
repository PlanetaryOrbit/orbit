import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
};

export default withAuth(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "DELETE")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const { id, sid, noteId } = req.query;
  if (!id || !sid || !noteId)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  try {
    const note = await prisma.sessionNote.findFirst({
      where: {
        id: noteId as string,
        sessionId: sid as string,
        session: {
          sessionType: {
            workspaceGroupId: parseInt(id as string),
          },
        },
      },
    });

    if (!note) {
      return res.status(404).json({ success: false, error: "Note not found" });
    }

    const user = await prisma.user.findUnique({
      where: {
        userid: BigInt(req.auth.userId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(id as string),
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: parseInt(id as string),
          },
        },
      },
    });

    const membership = user?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const isAuthor = note.authorId.toString() === req.auth.userId.toString();
    if (!isAdmin && !isAuthor) {
      return res
        .status(403)
        .json({ success: false, error: "You can only delete your own notes" });
    }

    await prisma.sessionNote.delete({
      where: {
        id: noteId as string,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to delete note:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete note" });
  }
}
