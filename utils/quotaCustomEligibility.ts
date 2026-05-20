import prisma from "@/utils/database";

export async function getQuotaForMemberOrThrow(
  workspaceId: number,
  quotaId: string,
  options?: { mustBeCustom?: boolean }
) {
  const quota = await prisma.quota.findFirst({
    where: { id: quotaId, workspaceGroupId: workspaceId },
    include: { quotaRoles: true, quotaDepartments: true, quotaUsers: true },
  });
  if (!quota) return { error: "Quota not found" as const };
  if (options?.mustBeCustom && quota.type !== "custom") {
    return { error: "Not a custom quota" as const };
  }
  return { quota } as const;
}

export async function memberHasQuotaAssignment(
  workspaceId: number,
  userId: bigint,
  quota: {
    quotaRoles: { roleId: string }[];
    quotaDepartments: { departmentId: string }[];
    quotaUsers?: { userId: bigint }[];
  }
) {
  const hasDirectUser = (quota.quotaUsers ?? []).some(
    (qu) => qu.userId === userId
  );
  if (hasDirectUser) return true;

  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: { where: { workspaceGroupId: workspaceId } },
      workspaceMemberships: {
        where: { workspaceGroupId: workspaceId },
        include: { departmentMembers: { include: { department: true } } },
      },
    },
  });
  if (!user) return false;
  const userRoleIds = user.roles.map((r) => r.id);
  const userDepartmentIds =
    user.workspaceMemberships[0]?.departmentMembers.map((dm) => dm.department.id) ?? [];
  const hasRole = quota.quotaRoles.some((qr) => userRoleIds.includes(qr.roleId));
  const hasDept = quota.quotaDepartments.some((qd) =>
    userDepartmentIds.includes(qd.departmentId)
  );
  return hasRole || hasDept;
}
