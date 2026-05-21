import type { NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import { AuthenticatedRequest } from "@/lib/withAuth";
import { isValidFolderIcon } from "@/utils/folderIcons";

type Data = {
  success: boolean;
  error?: string;
  folder?: { id: string; name: string; parentId: string | null; icon: string };
};

export default withPermissionCheck(handler, "create_docs");

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  const { name, parentId, icon } = req.body as {
    name?: string;
    parentId?: string | null;
    icon?: string;
  };

  if (!name?.trim()) {
    return res.status(400).json({ success: false, error: "Folder name is required" });
  }

  if (icon !== undefined && icon !== null && !isValidFolderIcon(icon)) {
    return res.status(400).json({ success: false, error: "Invalid folder icon" });
  }

  if (parentId) {
    const parent = await prisma.documentFolder.findFirst({
      where: { id: parentId, workspaceGroupId: workspaceId },
    });
    if (!parent) {
      return res.status(400).json({ success: false, error: "Parent folder not found" });
    }
  }

  const folder = await prisma.documentFolder.create({
    data: {
      name: name.trim(),
      icon: icon && isValidFolderIcon(icon) ? icon : "folder",
      workspaceGroupId: workspaceId,
      parentId: parentId || null,
    },
  });

  try {
    await logAudit(
      workspaceId,
      Number(req.auth.userId),
      "document.folder.create",
      `folder:${folder.id}`,
      { id: folder.id, name: folder.name, parentId: folder.parentId }
    );
  } catch {}

  return res.status(200).json({
    success: true,
    folder: { id: folder.id, name: folder.name, parentId: folder.parentId, icon: folder.icon },
  });
}
