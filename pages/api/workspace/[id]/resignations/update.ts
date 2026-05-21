import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { logAudit } from "@/utils/logs";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { AuthenticatedRequest } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, [
  "approve_resignations",
  "manage_resignations",
]);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!req.auth.userId) {
    return res.status(401).json({ success: false, error: "Not logged in" });
  }

  const { status, id, reviewComment } = req.body;

  if (!["approve", "deny", "cancel"].includes(status)) {
    return res.status(400).json({ success: false, error: "Invalid status" });
  }

  if (!id || typeof id !== "string") {
    return res.status(400).json({ success: false, error: "Invalid id" });
  }

  const workspaceId = parseInt(req.query.id as string, 10);

  if (status === "cancel") {
    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(req.auth.userId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
      },
    });

    const membership = user?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const hasManagePermission =
      isAdmin ||
      user?.roles.some((role) =>
        role.permissions.includes("manage_resignations")
      );

    if (!hasManagePermission) {
      return res.status(403).json({
        success: false,
        error:
          "Insufficient permissions. Removing a resignation requires manage_resignations.",
      });
    }
  }

  try {
    const resignation = await prisma.staffResignation.findUnique({
      where: { id },
    });

    if (!resignation || resignation.workspaceGroupId !== workspaceId) {
      return res.status(404).json({ success: false, error: "Not found" });
    }

    const before = resignation;
    const sessionUserId = (req as any ).auth?.userId ?? null;

    if (status === "cancel") {
      await prisma.staffResignation.delete({
        where: { id },
      });
      try {
        await logAudit(
          resignation.workspaceGroupId,
          sessionUserId,
          "resignation.cancel",
          `resignation:${id}`,
          { before, after: null, reviewer: sessionUserId }
        );
      } catch {}
    } else {
      const after = await prisma.staffResignation.update({
        where: { id },
        data: {
          approved: status === "approve",
          reviewed: true,
          reviewComment: reviewComment || null,
          reviewerId: BigInt(req.auth.userId),
        },
      });
      try {
        await logAudit(
          after.workspaceGroupId,
          sessionUserId,
          status === "approve" ? "resignation.approve" : "resignation.deny",
          `resignation:${id}`,
          { before, after, reviewer: sessionUserId }
        );
      } catch {}
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[API ERROR]", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
