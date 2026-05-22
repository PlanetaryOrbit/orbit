import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withKey } from "@/lib/withAuth";

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { id, did } = req.query;

  const workspaceId = Number.parseInt(id as string);
  if (!workspaceId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  }

  const departmentIdString = Array.isArray(did) ? did[0] : did;
  if (!departmentIdString) {
    return res
      .status(400)
      .json({ success: false, error: "Missing department ID" });
  }

  try {
    const department = await prisma.department.findFirst({
      where: {
        workspaceGroupId: workspaceId,
        id: departmentIdString
      },
      select: {
        departmentMembers: {
          select: {
            workspaceMember: {
              select: {
                user: true,
                userId: true,
              }
            }
          }
        }
      }
    });

    const formattedData = department?.departmentMembers.map((member) => ({
      userId: member.workspaceMember.userId,
      username: member.workspaceMember.user.username,
      picture: member.workspaceMember.user.picture
    }));
    return res.status(200).json({ success: true, data: formattedData || [] });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
