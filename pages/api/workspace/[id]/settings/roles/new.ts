import type { NextApiRequest, NextApiResponse } from "next";
import prisma, { role } from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import cache from "@/utils/cache";

type Data = {
  success: boolean;
  error?: string;
  role?: role;
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

  const workspaceId = parseInt(req.query.id as string);

  if (!Number.isInteger(workspaceId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid workspace id",
    });
  }

  const role = await prisma.role.create({
    data: {
      name: "New role",
      workspaceGroupId: workspaceId,
    },
  });

  try {
    await logAudit(
      workspaceId,
      (req as any).auth?.userId || null,
      "settings.roles.create",
      `role:${role.id}`,
      {
        id: role.id,
        name: role.name,
      },
    );
  } catch (e) {}

  const roleCacheKey = `workspace:${workspaceId}:roles`;

  await cache.del(roleCacheKey);

  const updatedRoles = await prisma.role.findMany({
    where: {
      workspaceGroupId: workspaceId,
    },
    orderBy: {
      position: "asc",
    },
  });

  await cache.set(
    roleCacheKey,
    updatedRoles,
    300,
  );

  return res.status(200).json({
    success: true,
    role,
  });
}
