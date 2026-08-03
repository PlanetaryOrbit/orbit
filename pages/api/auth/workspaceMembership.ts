import { NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import prisma from "@/utils/database";
import cache from "@/utils/cache";

export default withAuth(handler);

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const cacheKey = `user:workspaces:${req.auth.userId}`;

  try {
    let data = await cache.get<any[]>(cacheKey);

    if (!data) {
      const user = await prisma.user.findFirst({
        where: {
          userid: req.auth.userId,
        },
        include: {
          workspaceMemberships: {
            include: {
              workspace: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      data = user.workspaceMemberships.map((group) => ({
        groupId: group.workspaceGroupId,
        groupName: group.workspace.groupName,
        groupLogo: group.workspace.groupLogo,
        customName: group.workspace.customName,
      }));

      await cache.set(
        cacheKey,
        data,
        300
      );
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Workspace fetch error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
