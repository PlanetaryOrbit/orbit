import type { NextApiRequest, NextApiResponse } from "next";
import prisma, { document } from "@/utils/database";
import { withPermissionCheck } from "@/utils/permissionsManager";
import { AuthenticatedRequest } from "@/lib/withAuth";

type Data = {
  success: boolean;
  error?: string;
  docs?: document[];
};

export default withPermissionCheck(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const workspaceGroupId = parseInt(req.query.id as string);
  const user = await prisma.user.findFirst({
    where: { userid: req.auth.userId },
    include: {
      roles: { where: { workspaceGroupId } },
      workspaceMemberships: {
        where: { workspaceGroupId },
        include: { departmentMembers: true },
      },
    },
  });

  if (!user?.roles?.length) {
    return res.status(403).json({ success: false, error: "You do not have permission to view this workspace." });
  }

  const membership = user.workspaceMemberships[0];
  const isAdmin = membership?.isAdmin || false;
  const userRoleIds = user.roles.map((r) => r.id);
  const userDepartmentIds =
    membership?.departmentMembers.map((d) => d.departmentId) ?? [];

  const canManage =
    isAdmin ||
    user.roles.some((r) =>
      ["create_docs", "edit_docs", "delete_docs"].some((p) =>
        r.permissions.includes(p)
      )
    );

  const baseWhere = {
    workspaceGroupId,
    requiresAcknowledgment: false,
  };

  const docs = await prisma.document.findMany({
    where: canManage
      ? baseWhere
      : {
          ...baseWhere,
          OR: [
            ...(userRoleIds.length > 0
              ? [{ roles: { some: { id: { in: userRoleIds } } } }]
              : []),
            ...(userDepartmentIds.length > 0
              ? [{ departments: { some: { id: { in: userDepartmentIds } } } }]
              : []),
            { roles: { none: {} }, departments: { none: {} } },
          ],
        },
    include: {
      owner: { select: { username: true, picture: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  res.status(200).json({
    success: true,
    docs: JSON.parse(
      JSON.stringify(docs, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
    ),
  });
}
