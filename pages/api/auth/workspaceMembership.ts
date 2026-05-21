import { NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import prisma from "@/utils/database";

export default withAuth(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

    const user = await prisma.user.findFirst({
      where: {
        userid: req.auth.userId,
      },
      include: {
        workspaceMemberships: {
          include: {
            workspace: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

  const data = user.workspaceMemberships.map((group) => ({
    groupId: group.workspaceGroupId,
    groupName: group.workspace.groupName,
    groupLogo: group.workspace.groupLogo,
    customName: group.workspace.customName,
  }))

  res.status(200).json({ success: true, data });
}
