import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

type Data = {
  success: boolean;
  error?: string;
  linkInfo?: {
    documentName: string;
    directLink: string;
    isPublic: boolean;
    requiresAuthentication: boolean;
    roles: string[];
  };
};

export default withPermissionCheck(handler, "manage_policies");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const { id, docId } = req.query;

  if (!id || !docId)
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });

  // Get the document with role information
  const document = await prisma.document.findFirst({
    where: {
      id: docId as string,
      workspaceGroupId: parseInt(id as string),
      requiresAcknowledgment: true,
    },
    include: {
      roles: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!document) {
    return res
      .status(404)
      .json({ success: false, error: "Policy document not found" });
  }

  // Generate the direct link with proper protocol detection
  let baseUrl: string;
  if (process.env.NEXTAUTH_URL) {
    baseUrl = process.env.NEXTAUTH_URL;
  } else {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto;
    const finalProtocol =
      protocol || (req.headers.host?.includes("localhost") ? "http" : "https");
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    baseUrl = `${finalProtocol}://${host}`;
  }
  const directLink = `${baseUrl}/workspace/${id}/policies/sign/${docId}`;

  res.status(200).json({
    success: true,
    linkInfo: {
      documentName: document.name,
      directLink,
      isPublic: false,
      requiresAuthentication: true,
      roles: document.roles.map((role) => role.name),
    },
  });
}