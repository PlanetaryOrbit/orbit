/**
 * Orbit API
 *
 * Handles GET /@me that returns the authenticated user's information.
 *
 * @module pages/api/v2
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

import type { NextApiRequest, NextApiResponse } from "next";
import type { RequestResponse } from "./types";
import { authenticate } from "@/lib/v2/withAuth";
import { prisma } from "@/lib/prisma";
import cache from "@/utils/v2/cache";

type MeResponse = {
  user: {
    userid: bigint;
    username: string | null;
    picture: string | null;

    registered: boolean | null;
    isOwner: boolean | null;
    isFirstLogin: boolean;

    roles: {
      id: string;
      name: string;
      color: string | null;
      permissions: string[];
      isOwnerRole: boolean | null;
      workspaceGroupId: number;
    }[];

    workspaceMemberships: {
      workspaceGroupId: number;
      joinDate: Date | null;
      isAdmin: boolean | null;
      timezone: string | null;

      workspace: {
        groupId: number;
        groupName: string | null;
        groupLogo: string | null;
        customName: string | null;
        isVerified: boolean | null;
      };
    }[];

    ranks: {
      rankId: bigint;
      workspaceGroupId: number;
    }[];

    activityHistory: {
      id: string;
      periodStart: Date;
      periodEnd: Date;
      minutes: number;
      messages: number;
      sessionsHosted: number;
      sessionsAttended: number;
      idleTime: number;
      wallPosts: number;
      quotaProgress: unknown;
      createdAt: Date;
    }[];
  };

  permissions: string[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RequestResponse<MeResponse>>,
) {
  if (req.method != "GET") {
    return res.status(405).json({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." },
    });
  }

  const auth = await authenticate(req);

  if (!auth) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized.",
      },
    });
  }

  const cacheKey = `me:${auth.user.userid}`;
  const cached = await cache.get<MeResponse>(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      data: cached,
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      userid: auth.user.userid,
    },

    select: {
      userid: true,
      username: true,
      picture: true,

      registered: true,
      isOwner: true,
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
          googleUserId: true,
          username: true,
          avatar: true,
          email: true,
        },
      },

      roles: {
        select: {
          id: true,
          name: true,
          color: true,
          permissions: true,
          isOwnerRole: true,
          workspaceGroupId: true,
        },
      },

      workspaceMemberships: {
        select: {
          workspaceGroupId: true,
          joinDate: true,
          isAdmin: true,
          timezone: true,

          workspace: {
            select: {
              groupId: true,
              groupName: true,
              groupLogo: true,
              customName: true,
              isVerified: true,
            },
          },
        },
      },

      ranks: {
        select: {
          rankId: true,
          workspaceGroupId: true,
        },
      },

      activityHistory: {
        orderBy: {
          periodEnd: "desc",
        },
        take: 10,
      },
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found.",
      },
    });
  }

  const permissions = user.isOwner
    ? ["*"]
    : [...new Set(user.roles.flatMap((role) => role.permissions))];

  await cache.set(cacheKey, {user, permissions}, 300);

  return res.status(200).json({
    success: true,
    data: {
      user,
      permissions,
    }
  })
}
