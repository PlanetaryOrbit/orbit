import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { AuthenticatedRequest } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
  entry?: any;
};

export default withPermissionCheck(handler, "manage_members");

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const { id, uid, entryId } = req.query;
  if (!id || !uid || !entryId)
    return res.status(400).json({ success: false, error: "Missing required fields" });

  const workspaceGroupId = parseInt(id as string);

  try {
    const entry = await prisma.userBook.findUnique({
      where: { id: entryId as string },
    });
    if (!entry) return res.status(404).json({ success: false, error: "Entry not found" });
    if (entry.workspaceGroupId !== workspaceGroupId)
      return res.status(403).json({ success: false, error: "WorkspaceID doesn't match." });

    const { redacted } = req.body as { redacted?: boolean };
    const setRedacted = redacted === undefined ? true : Boolean(redacted);

    const updated = await prisma.userBook.update({
      where: { id: entryId as string },
      data: {
        redacted: setRedacted,
        redactedBy: setRedacted ? BigInt(req.auth.userId) : null,
        redactedAt: setRedacted ? new Date() : null,
      },
      include: {
        admin: true,
      },
    });

    let redactedByUser = null;
    if (updated.redactedBy) {
      try {
        const rUser = await prisma.user.findUnique({
          where: { userid: updated.redactedBy as bigint },
          select: { userid: true, username: true },
        });
        if (rUser) {
          redactedByUser = {
            userid: rUser.userid.toString(),
            username: rUser.username || null,
          };
        }
      } catch (e) {
        console.error("Failed to fetch action user", e);
      }
    }

    try {
      await logAudit(
        workspaceGroupId,
        req.auth.userId || null,
        setRedacted ? "userbook.redact" : "userbook.unredact",
        `userbook:${updated.id}`,
        { entryId: updated.id, redacted: updated.redacted }
      );
    } catch (e) {}

    const responseEntry: any = JSON.parse(
      JSON.stringify(updated, (k, v) => (typeof v === "bigint" ? v.toString() : v))
    );
    if (redactedByUser) responseEntry.redactedByUser = redactedByUser;

    res.status(200).json({
      success: true,
      entry: responseEntry,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to redact entry" });
  }
}
