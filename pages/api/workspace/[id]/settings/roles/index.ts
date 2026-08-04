import type { NextApiRequest, NextApiResponse } from "next";
import prisma, { role } from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import cache from "@/utils/cache";

type Data = {
  success: boolean;
  error?: string;
  roles?: role[];
};

export default withPermissionCheck(handler, "admin");

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const workspaceId = Number(req.query.id);

  if (!Number.isInteger(workspaceId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid workspace id",
    });
  }

  const cacheKey = `workspace:${workspaceId}:roles`;

  let roles = await cache.get<role[]>(cacheKey);

  if (!roles) {
    roles = await prisma.role.findMany({
      where: {
        workspaceGroupId: workspaceId,
      },
      orderBy: {
        position: "asc",
      },
    });

    await cache.set(
      cacheKey,
      roles,
      300,
    );
  }

  return res.status(200).json({
    success: true,
    roles,
  });
}
