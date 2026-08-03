import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import cache from "@/utils/cache";

type Data = {
  success: boolean;
  error?: string;
};

type RolePosition = {
  id: string;
  position: number;
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

  const workspaceId = Number(req.query.id);

  if (!Number.isInteger(workspaceId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid workspace id",
    });
  }

  const { roles } = req.body as {
    roles?: RolePosition[];
  };

  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({
      success: false,
      error: "roles must be a non-empty array",
    });
  }

  const positions = roles.map((r) => r.position);
  if (new Set(positions).size !== positions.length) {
    return res.status(400).json({
      success: false,
      error: "Duplicate role positions are not allowed",
    });
  }

  const ids = roles.map((r) => r.id);
  if (new Set(ids).size !== ids.length) {
    return res.status(400).json({
      success: false,
      error: "Duplicate role IDs are not allowed",
    });
  }

  for (const role of roles) {
    if (!Number.isInteger(role.position) || role.position < 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid position for role ${role.id}`,
      });
    }
  }

  const existingRoles = await prisma.role.findMany({
    where: {
      workspaceGroupId: workspaceId,
    },
    select: {
      id: true,
    },
  });

  const existingIds = new Set(existingRoles.map((r) => r.id));

  for (const role of roles) {
    if (!existingIds.has(role.id)) {
      return res.status(400).json({
        success: false,
        error: `Role ${role.id} does not belong to this workspace`,
      });
    }
  }

  await prisma.$transaction(
    roles.map((role) =>
      prisma.role.update({
        where: {
          id: role.id,
        },
        data: {
          position: role.position,
        },
      }),
    ),
  );

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
  });
}
