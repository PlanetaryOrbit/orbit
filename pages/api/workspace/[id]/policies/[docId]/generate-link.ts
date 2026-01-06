import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { logAudit } from "@/utils/logs";
import { withPermissionCheck } from "@/utils/permissionsManager";
import crypto from "crypto";

type Data = {
  success: boolean;
  error?: string;
  link?: string;
  metadata?: {
    documentName: string;
    expiresAt?: string;
    createdAt: string;
    token?: string;
  };
};

export default withPermissionCheck(handler, "manage_policies");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    console.error("SECURITY ERROR: SECRET_KEY environment variable is not set");
    return res
      .status(500)
      .json({
        success: false,
        error: "Server configuration error: SECRET_KEY not configured",
      });
  }

  const { id, docId } = req.query;
  const { expiresInHours = 24, requiresAuth = true } = req.body;

  if (!id || !docId)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  const document = await prisma.document.findFirst({
    where: {
      id: docId as string,
      workspaceGroupId: parseInt(id as string),
      requiresAcknowledgment: true,
    },
  });

  if (!document) {
    return res
      .status(404)
      .json({ success: false, error: "Policy document not found" });
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const directLink = `${baseUrl}/workspace/${id}/policies/sign/${docId}`;

  let secureToken: string | undefined = undefined;
  let expiresAt = null;

  if (expiresInHours && expiresInHours > 0) {
    expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    secureToken = crypto
      .createHmac("sha256", secretKey)
      .update(`${docId}:${id}:${expiresAt.getTime()}`)
      .digest("hex");
  }

  const shareableLink = directLink;

  try {
    await logAudit(
      parseInt(id as string),
      Number(req.session.userid),
      "policy.link_generated",
      `policy:${docId}`,
      {
        documentId: docId,
        documentName: document.name,
        linkType: "direct",
        expiresAt: expiresAt?.toISOString(),
        generatedBy: req.session.userid,
      }
    );
  } catch (e) {
    // ignore audit log errors
  }

  res.status(200).json({
    success: true,
    link: shareableLink,
    metadata: {
      documentName: document.name,
      expiresAt: expiresAt?.toISOString(),
      createdAt: new Date().toISOString(),
      ...(secureToken && { token: secureToken }),
    },
  });
}
