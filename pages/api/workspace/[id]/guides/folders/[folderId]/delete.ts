import type { NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { AuthenticatedRequest } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, "delete_docs");

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  const folderId = req.query.folderId as string;

  const folder = await prisma.documentFolder.findFirst({
    where: { id: folderId, workspaceGroupId: workspaceId },
  });

  if (!folder) {
    return res.status(404).json({ success: false, error: "Folder not found" });
  }

  await prisma.documentFolder.delete({ where: { id: folderId } });

  try {
    await logAudit(
      workspaceId,
      Number(req.auth.userId),
      "document.folder.delete",
      `folder:${folder.name}`,
      { id: folder.id, name: folder.name, parentId: folder.parentId }
    );
  } catch {}

  return res.status(200).json({ success: true });
}
