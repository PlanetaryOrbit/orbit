import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";

type Data = {
  success: boolean;
  error?: string;
  count?: number;
};

export default withPermissionCheck(handler, "approve_notices");

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  if (!req.session.userid)
    return res.status(401).json({ success: false, error: "Not logged in" });

  try {
    const workspaceId = parseInt(req.query.id as string);

    const count = await prisma.inactivityNotice.count({
      where: {
        workspaceGroupId: workspaceId,
        reviewed: false,
      },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    console.error("Pending notices count error:", error);
    return res
      .status(500)
      .json({
        success: false,
        error: error instanceof Error ? error.message : "Something went wrong",
      });
  }
}
