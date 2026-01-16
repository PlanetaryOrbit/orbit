import prisma from "@/utils/database";

export type SessionPermissionType =
  | "see"
  | "assign"
  | "claim"
  | "host"
  | "unscheduled"
  | "scheduled"
  | "manage";

export async function hasSessionTypePermission(
  userId: bigint,
  workspaceId: number,
  sessionType: string,
  permission: SessionPermissionType
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
      },
      workspaceMemberships: {
        where: { workspaceGroupId: workspaceId },
      },
    },
  });

  if (!user || !user.roles.length) return false;

  const membership = user.workspaceMemberships[0];
  if (membership?.isAdmin) return true;

  const role = user.roles[0];
  const permissionString = `sessions_${sessionType.toLowerCase()}_${permission}`;

  return role.permissions.includes(permissionString);
}

export async function getUserVisibleSessionTypes(
  userId: bigint,
  workspaceId: number
): Promise<string[]> {
  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
      },
      workspaceMemberships: {
        where: { workspaceGroupId: workspaceId },
      },
    },
  });

  if (!user || !user.roles.length) return [];

  const membership = user.workspaceMemberships[0];
  if (membership?.isAdmin) return ["shift", "training", "event", "other"];

  const role = user.roles[0];
  const sessionTypes = ["shift", "training", "event", "other"];

  return sessionTypes.filter((type) =>
    role.permissions.includes(`sessions_${type}_see`)
  );
}

export async function canPerformAnySessionAction(
  userId: bigint,
  workspaceId: number,
  permission: SessionPermissionType
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { userid: userId },
    include: {
      roles: {
        where: { workspaceGroupId: workspaceId },
      },
      workspaceMemberships: {
        where: { workspaceGroupId: workspaceId },
      },
    },
  });

  if (!user || !user.roles.length) return false;

  const membership = user.workspaceMemberships[0];
  if (membership?.isAdmin) return true;

  const role = user.roles[0];
  const sessionTypes = ["shift", "training", "event", "other"];

  return sessionTypes.some((type) =>
    role.permissions.includes(`sessions_${type}_${permission}`)
  );
}
