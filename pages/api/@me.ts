import type { NextApiResponse } from "next";
import prisma from "@/utils/database";
import {
  getUsername,
  getThumbnail,
  getDisplayName,
} from "@/utils/userinfoEngine";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import cache from "@/utils/cache";

type User = {
  userId: bigint;
  username: string;
  canMakeWorkspace: boolean;
  displayname: string;
  thumbnail: string;
  registered: boolean;
  isFirstLogin: boolean;
  birthdayDay?: number | null;
  birthdayMonth?: number | null;

  discordUser?: {
    discordUserId: string;
    username: string;
    avatar: string | null;
  } | null;

  googleUser?: {
    username: string;
    avatar: string | null;
    email: string | null;
  } | null;
};

type Data = {
  success: boolean;
  error?: string;
  user?: User;
  workspaces?: {
    groupId: number;
    groupThumbnail: string;
    groupName: string;
  }[];
};

export default withAuth(handler);

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<Data>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const userId = req.auth.session?.userId!;

  const cacheKey = `user:${userId}:profile`;
  const cached = await cache.get<Data>(cacheKey);

  if (cached) {
    return res.status(200).json(cached);
  }

  const robloxKey = `roblox:user:${userId}`;

  let roblox = await cache.get<{
    username: string;
    displayname: string;
    thumbnail: string;
  }>(robloxKey);

  if (!roblox) {
    const [username, displayname, thumbnail] = await Promise.all([
      getUsername(userId),
      getDisplayName(userId),
      Promise.resolve(getThumbnail(userId)),
    ]);

    roblox = {
      username,
      displayname,
      thumbnail,
    };

    await cache.set(robloxKey, roblox, 60 * 30);
  }

  const dbuser = await prisma.user.findUnique({
    where: {
      userid: userId,
    },

    select: {
      isOwner: true,

      registered: true,

      birthdayDay: true,

      birthdayMonth: true,

      isFirstLogin: true,

      discordUser: {
        select: {
          discordUserId: true,
          username: true,
          avatar: true,
        },
      },

      googleUser: {
        select: {
          username: true,
          avatar: true,
          email: true,
        },
      },

      roles: {
        select: {
          workspaceGroupId: true,
        },
      },
    },
  });

  const workspaceCacheKey = `user:${userId}:workspaces`;

  let workspaces = await cache.get<Data["workspaces"]>(workspaceCacheKey);

  if (!workspaces) {
    const ids = [
      ...new Set(dbuser?.roles.map((role) => role.workspaceGroupId) ?? []),
    ];

    const workspaceRows = ids.length
      ? await prisma.workspace.findMany({
          where: {
            groupId: {
              in: ids,
            },
          },

          select: {
            groupId: true,
            groupName: true,
            groupLogo: true,
            customName: true,
          },
        })
      : [];

    workspaces = workspaceRows.map((w) => ({
      groupId: w.groupId,

      groupThumbnail: w.groupLogo,

      groupName: w.customName ?? w.groupName,
    }));

    await cache.set(workspaceCacheKey, workspaces, 60 * 5);
  }

  const response: Data = {
    success: true,

    user: {
      userId,

      username: roblox.username,

      displayname: roblox.displayname,

      thumbnail: roblox.thumbnail,

      canMakeWorkspace: dbuser?.isOwner ?? false,

      registered: dbuser?.registered ?? false,

      birthdayDay: dbuser?.birthdayDay ?? null,

      birthdayMonth: dbuser?.birthdayMonth ?? null,

      isFirstLogin: dbuser?.isFirstLogin ?? true,

      discordUser: dbuser?.discordUser
        ? {
            discordUserId: dbuser.discordUser.discordUserId.toString(),

            username: dbuser.discordUser.username,

            avatar: dbuser.discordUser.avatar,
          }
        : null,

      googleUser: dbuser?.googleUser
        ? {
            username: dbuser.googleUser.username,

            avatar: dbuser.googleUser.avatar ?? null,

            email: dbuser.googleUser.email ?? null,
          }
        : null,
    },

    workspaces,
  };

  await cache.set(cacheKey, response, 300);

  setImmediate(async () => {
    try {
      await prisma.user.update({
        where: {
          userid: userId,
        },

        data: {
          picture: roblox.thumbnail,
          username: roblox.username,
          registered: true,
        },
      });
    } catch (err) {
      console.error("[User Sync]", err);
    }
  });

  return res.status(200).json(response);
}
