import type { NextApiRequest, NextApiResponse } from "next";
import { fetchworkspace } from "@/utils/configEngine";
import prisma from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { logAudit } from "@/utils/logs";
import cache from "@/utils/cache";
import * as noblox from "noblox.js";

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

  const role = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      error: "Role not found",
    });
  }

  const groupRoles = req.body.groupRoles || [];

  if (groupRoles.length > 0) {
    const workspace = await fetchworkspace(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: "Workspace not found",
      });
    }

    const robloxRoles = await noblox.getRoles(workspace.groupId);
    const guestRole = robloxRoles.find((r) => r.rank === 0);

    if (
      guestRole &&
      groupRoles.map(BigInt).map(String).includes(String(BigInt(guestRole.id)))
    ) {
      return res.status(400).json({
        success: false,
        error: "Guest rank cannot be assigned to roles",
      });
    }

    const conflictingRoles = await prisma.role.findMany({
      where: {
        workspaceGroupId: workspaceId,
        id: {
          not: roleId,
        },
        groupRoles: {
          hasSome: groupRoles.map((id: string | number) => BigInt(id)),
        },
      },
    });

    if (conflictingRoles.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Each rank can only be assigned to one role.",
      });
    }
  }

  await prisma.role.update({
    where: {
      id: roleId,
    },
    data: {
      name: req.body.name || "Untitled Role",
      permissions: req.body.permissions || [],
      groupRoles: req.body.groupRoles || [],
      color: req.body.color || null,
    },
  });

  let after;

  try {
    after = await prisma.role.findUnique({
      where: {
        id: roleId,
      },
    });

    await logAudit(
      workspaceId,
      (req as any).auth?.userId || null,
      "settings.roles.update",
      `role:${roleId}`,
      {
        roleName: after?.name || role.name,
        before: role,
        after,
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
