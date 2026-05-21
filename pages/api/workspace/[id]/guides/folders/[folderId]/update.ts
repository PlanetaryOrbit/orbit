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

export default withPermissionCheck(handler, "edit_docs");

async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceId = parseInt(req.query.id as string);
  const folderId = req.query.folderId as string;
  const { name, parentId, icon } = req.body as {
    name?: string;
    parentId?: string | null;
    icon?: string;
  };

  const existing = await prisma.documentFolder.findFirst({
    where: { id: folderId, workspaceGroupId: workspaceId },
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: "Folder not found" });
  }

  const data: { name?: string; parentId?: string | null; icon?: string } = {};

  if (typeof name === "string" && name.trim()) {
    data.name = name.trim();
  }

  if (typeof icon === "string") {
    if (!isValidFolderIcon(icon)) {
      return res.status(400).json({ success: false, error: "Invalid folder icon" });
    }
    data.icon = icon;
  }

  if (parentId !== undefined) {
    if (parentId === folderId) {
      return res.status(400).json({ success: false, error: "A folder cannot be moved into itself" });
    }

    if (parentId) {
      const parent = await prisma.documentFolder.findFirst({
        where: { id: parentId, workspaceGroupId: workspaceId },
      });
      if (!parent) {
        return res.status(400).json({ success: false, error: "Parent folder not found" });
      }

      let cursor: string | null = parentId;
      while (cursor) {
        if (cursor === folderId) {
          return res
            .status(400)
            .json({ success: false, error: "Cannot move a folder into one of its subfolders" });
        }
        const node: { parentId: string | null } | null = await prisma.documentFolder.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
        cursor = node?.parentId ?? null;
      }
    }

    data.parentId = parentId || null;
  }

  if (!data.name && data.parentId === undefined && data.icon === undefined) {
    return res.status(400).json({ success: false, error: "Nothing to update" });
  }

  const folder = await prisma.documentFolder.update({
    where: { id: folderId },
    data,
  });

  try {
    await logAudit(
      workspaceId,
      Number(req.auth.userId),
      "document.folder.update",
      `folder:${folder.id}`,
      {
        before: { id: existing.id, name: existing.name, parentId: existing.parentId, icon: existing.icon },
        after: { id: folder.id, name: folder.name, parentId: folder.parentId, icon: folder.icon },
      }
    );
  } catch {}

  return res.status(200).json({
    success: true,
    folder: { id: folder.id, name: folder.name, parentId: folder.parentId, icon: folder.icon },
  });
}
