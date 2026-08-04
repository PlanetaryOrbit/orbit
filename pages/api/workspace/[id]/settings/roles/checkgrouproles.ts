import type { NextApiRequest, NextApiResponse } from "next";
import {
  withPermissionCheck,
  checkGroupRoles,
} from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import cache from "@/utils/cache";

type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, "admin");

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const workspaceId = parseInt(req.query.id as string);

    if (isNaN(workspaceId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid workspace ID",
      });
    }

    await checkGroupRoles(workspaceId);

    const roleCacheKey = `workspace:${workspaceId}:roles`;
    await cache.del(roleCacheKey);

    const roles = await prisma.role.findMany({
      where: {
        workspaceGroupId: workspaceId,
      },
      orderBy: {
        position: "asc",
      },
    });

    await cache.set(
      roleCacheKey,
      roles,
      300,
    );

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Error in checkgrouproles handler:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to sync group roles",
    });
  }
}
