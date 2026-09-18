import type { NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { AuthenticatedRequest } from "@/lib/withAuth";
import { getThumbnail } from "@/utils/userinfoEngine";

type Data = {
  success: boolean;
  error?: string;
  users?: any;
};

const RESULT_LIMIT = 20;

export default withPermissionCheck(handler, "create_alliances");

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET")
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  if (!req.auth.userId)
    return res.status(401).json({ success: false, error: "Not logged in" });

  try {
    const wsId = parseInt(req.query.id as string, 10);
    const query = String(req.query.q ?? "").trim();

    if (!query) {
      return res.status(200).json({ success: true, users: [] });
    }

    const members = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: "insensitive",
        },
        OR: [
          { workspaceMemberships: { some: { workspaceGroupId: wsId } } },
          { roles: { some: { workspaceGroupId: wsId } } },
        ],
      },
      include: {
        roles: {
          where: { workspaceGroupId: wsId },
          select: { permissions: true },
        },
      },
      orderBy: { username: "asc" },
      take: RESULT_LIMIT,
    });

    const users = members.map((user: any) => ({
      userid: Number(user.userid),
      username: user.username,
      thumbnail: getThumbnail(user.userid),
      canRep: user.roles.some((role: any) =>
        role.permissions.includes("represent_alliance")
      ),
    }));

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, error: "Something went wrong" });
  }
}
