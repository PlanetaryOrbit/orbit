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

  const { id, roleId } = req.query;

  const workspaceId = Number.parseInt(id as string);
  if (!workspaceId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing workspace ID" });
  }

  const roleIdString = Array.isArray(roleId) ? roleId[0] : roleId;
  if (!roleIdString) {
    return res
      .status(400)
      .json({ success: false, error: "Missing role ID" });
  }

  try {
    const role = await prisma.role.findFirst({
      where: {
        workspaceGroupId: workspaceId,
        id: roleIdString
      },
      select: {
        members: true
      }
    });

    const formattedData = role?.members.map((member) => ({
      userId: member.userid,
      username: member.username,
      picture: member.picture
    }));
    return res.status(200).json({ success: true, data: formattedData || [] });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
