import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
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

  const workspaceId = parseInt(req.query.id as string);
  const roleId = req.query.roleid as string;

  if (!roleId) {
    return res.status(400).json({
      success: false,
      error: "Role ID not provided",
    });
  }

  if (isNaN(workspaceId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid workspace ID",
    });
  }

  const roles = await prisma.role.findMany({
    where: {
      workspaceGroupId: workspaceId,
    },
    orderBy: {
      position: "asc",
    },
  });

  if (roles.length <= 1) {
    return res.status(400).json({
      success: false,
      error: "You cannot delete the only role",
    });
  }

  const oldRole = roles.find((r) => r.id === roleId);

  if (!oldRole) {
    return res.status(404).json({
      success: false,
      error: "Role not found",
    });
  }

  const adminMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceGroupId: workspaceId,
      isAdmin: true,
      user: {
        roles: {
          some: {
            id: roleId,
          },
        },
      },
    },
  });

  if (adminMembers.length > 0) {
    return res.status(403).json({
      success: false,
      error: "Cannot delete a role assigned to an admin user",
    });
  }

  const fallbackRole = roles.find((r) => r.id !== roleId);

  if (!fallbackRole) {
    return res.status(400).json({
      success: false,
      error: "No fallback role available",
    });
  }

  const members = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          id: roleId,
        },
      },
    },
    select: {
      userid: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const member of members) {
      await tx.user.update({
        where: {
          userid: member.userid,
        },
        data: {
          roles: {
            connect: {
              id: fallbackRole.id,
            },
            disconnect: {
              id: roleId,
            },
          },
        },
      });
    }

    await tx.role.delete({
      where: {
        id: roleId,
      },
    });
  });

  try {
    await logAudit(
      workspaceId,
      (req as any).auth?.userId || null,
      "settings.roles.delete",
      `role:${oldRole.name}`,
      {
        id: roleId,
        name: oldRole.name,
      },
    );
  } catch {}

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
