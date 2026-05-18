import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { AuthenticatedRequest } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "DELETE")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const { id, uid, entryId } = req.query;
  if (!id || !uid || !entryId)
    return res.status(400).json({ success: false, error: "Missing required fields" });

  const workspaceGroupId = parseInt(id as string);
  const profileUserId = BigInt(uid as string);

  try {
    const entry = await prisma.userBook.findUnique({
      where: { id: entryId as string },
    });
    if (!entry) return res.status(404).json({ success: false, error: "Entry not found." });
    if (entry.workspaceGroupId !== workspaceGroupId)
      return res.status(403).json({ success: false, error: "WorkspaceID doesn't match." });
    if (entry.userId !== profileUserId)
      return res.status(403).json({ success: false, error: "Entry does not belong to this profile." });

    await prisma.userBook.delete({ where: { id: entryId as string } });

    try {
      await logAudit(
        workspaceGroupId,
        req.auth.userId || null,
        "userbook.delete",
        `userbook:${entryId}`,
        { entryId }
      );
    } catch (e) {}

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete entry" });
  }
}

export default withPermissionCheck(handler, "logbook_delete");
