import type { NextApiRequest, NextApiResponse } from "next";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import prisma from "@/utils/database";
import { sanitizeJSON } from "@/utils/sanitise";

type Data = {
  success: boolean;
  error?: string;
  document?: any;
};

export default withPermissionCheck(handler, "manage_docs");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  if (!req.query.docid)
    return res
      .status(400)
      .json({ success: false, error: "Document ID not provided" });
  const { name, content, roles, departments } = req.body;
  if (!name || !roles)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  if (content && typeof content === "object" && (content as any).external) {
    const url = (content as any).url;
    if (!url || typeof url !== "string")
      return res
        .status(400)
        .json({ success: false, error: "External URL required" });
    if (!url.startsWith("https://"))
      return res
        .status(400)
        .json({ success: false, error: "External URL must use https://" });
  }
  const workspaceId = parseInt(req.query.id as string);

  try {
    try {
      const documentBefore = await prisma.document.findUnique({
        where: { id: req.query.docid as string },
        include: { 
          roles: { select: { id: true, name: true } },
          departments: { select: { id: true, name: true } }
        },
      });
      if (!documentBefore || documentBefore.workspaceGroupId !== workspaceId) {
        return res.status(404).json({
          success: false,
          error: "Document not found in this workspace",
        });
      }

      let saveContent = content;
      if (
        content &&
        typeof content === "object" &&
        !(content as any).external
      ) {
        saveContent = sanitizeJSON(content);
      }

      const updated = await prisma.document.update({
        where: { id: req.query.docid as string },
        data: {
          name,
          content: saveContent,
          roles: {
            set: [],
            connect: roles.map((role: string) => ({ id: role })),
          },
          departments: {
            set: [],
            connect: departments ? departments.map((dept: string) => ({ id: dept })) : [],
          },
        },
        include: { 
          roles: { select: { id: true, name: true } },
          departments: { select: { id: true, name: true } }
        },
      });

      try {
        const beforeDetails: any = {
          id: documentBefore.id,
          name: documentBefore.name,
          roles: (documentBefore.roles || []).map((r: any) => r.name),
          departments: (documentBefore.departments || []).map((d: any) => d.name),
        };
        if (
          documentBefore.content &&
          typeof documentBefore.content === "object" &&
          (documentBefore.content as any).external
        ) {
          beforeDetails.url = (documentBefore.content as any).url;
        }

        const afterDetails: any = {
          id: updated.id,
          name: updated.name,
          roles: (updated.roles || []).map((r: any) => r.name),
          departments: (updated.departments || []).map((d: any) => d.name),
        };
        if (
          updated.content &&
          typeof updated.content === "object" &&
          (updated.content as any).external
        ) {
          afterDetails.url = (updated.content as any).url;
        }

        await logAudit(
          workspaceId,
          Number(req.session.userid),
          "document.update",
          `document:${req.query.docid as string}`,
          { before: beforeDetails, after: afterDetails }
        );
      } catch (e) {}

      return res.status(200).json({
        success: true,
        document: JSON.parse(
          JSON.stringify(updated, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
      });
    } catch (e: any) {
      if (e && e.message === "NOT_FOUND") {
        return res.status(404).json({
          success: false,
          error: "Document not found in this workspace",
        });
      }
      console.error(e);
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  } catch (e: any) {
    if (e && e.message === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: "Document not found in this workspace",
      });
    }
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}
