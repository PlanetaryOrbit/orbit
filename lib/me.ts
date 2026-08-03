import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";

export type MeUser = {
  id: string;
  username: string;
  roblox: {
    id: number;
    username: string;
    displayName: string;
    hasVerifiedBadge: boolean;
    isBanned: boolean;
    avatarUrl: string | null;
    syncedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean | false;
};

export async function getMe(): Promise<MeUser | null> {
  const auth = await authenticate();

  if (!auth) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: auth.id,
    },
    select: {
      id: true,
      username: true,
      robloxData: true,
      createdAt: true,
      updatedAt: true,
      isOwner: true,
    },
  });

  if (!user) {
    return null;
  }

  const robloxData = user.robloxData as {
    id: number;
    username: string;
    displayName: string;
    hasVerifiedBadge: boolean;
    isBanned: boolean;
    avatarUrl: string | null;
    syncedAt: string;
  } | null;

  return {
    id: user.id,
    username: user.username,
    isOwner: user.isOwner,
    roblox: robloxData
      ? {
          id: robloxData.id,
          username: robloxData.username,
          displayName: robloxData.displayName,
          hasVerifiedBadge: robloxData.hasVerifiedBadge,
          isBanned: robloxData.isBanned,
          avatarUrl: robloxData.avatarUrl,
          syncedAt: robloxData.syncedAt,
        }
      : null,

    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
