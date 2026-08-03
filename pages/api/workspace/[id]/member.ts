import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import cache from "@/utils/cache";

type Data = {
  success: boolean;
  error?: string;
  member?: {
    userId: number;
    isAdmin: boolean | null;
    joinDate: Date | null;
    timezone: string | null;
  };
};

export default withAuth(async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });

  const workspaceGroupId = parseInt(req.query.id as string, 10);
  if (!workspaceGroupId)
    return res
      .status(400)
      .json({ success: false, error: "Invalid workspace id" });

  const userid = req.auth.userId ? Number(req.auth.userId) : null;
  if (!userid)
    return res.status(401).json({ success: false, error: "Not logged in" });

  const cached = await cache.get<Data>(`member:${workspaceGroupId}:${userid}`);
  if (cached) return res.status(200).json(cached);

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceGroupId_userId: {
        workspaceGroupId,
        userId: userid,
      },
    },
  });

  if (!member)
    return res.status(404).json({ success: false, error: "Member not found" });

  await cache.set(
    `member:${workspaceGroupId}:${userid}`,
    {
      success: true,
      member: {
        userId: Number(member.userId),
        isAdmin: member.isAdmin,
        joinDate: member.joinDate,
        timezone: member.timezone,
      },
    },
    300,
  );
  return res.status(200).json({
    success: true,
    member: {
      userId: Number(member.userId),
      isAdmin: member.isAdmin,
      joinDate: member.joinDate,
      timezone: member.timezone,
    },
  });
});
