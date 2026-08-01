/**
 * Orbit API
 *
 * Does auth stuff, returns a user's session and minimal user data.
 *
 * @module pages/api/v2/auth
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

import type { NextApiRequest } from "next";
import { parse } from "cookie";
import * as crypto from "crypto";
import cache from "@/utils/v2/cache";
import { prisma } from "@/lib/prisma";
import fetchAvatar from "@/utils/v2/avatar";

export type AuthUser = {
  session: {
    id: string;
    token: string;
    expiresAt: Date;
  };

  user: {
    userid: bigint;
    username: string;
    picture: string;
    isOwner: boolean;
    registered: boolean;
  };

  permissions: string[];
};

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token.replace(/^DONOTSHARE_/i, ""))
    .digest("hex");
}

export async function authenticate(
  req: NextApiRequest,
): Promise<AuthUser | null> {
  const cookies = parse(req.headers.cookie ?? "");
  const token = cookies.session_token;

  if (!token) {
    return null;
  }

  const cachedSession = await cache.get<AuthUser>(
    `session:${token}`,
  );

  if (cachedSession) {
    return cachedSession;
  }

  const session = await prisma.authSession.findUnique({
    where: {
      token: hashToken(token),
    },

    include: {
      user: {
        select: {
          userid: true,
          username: true,
          isOwner: true,
          registered: true,

          roles: {
            select: {
              permissions: true,
              isOwnerRole: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.authSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  const avatar = await fetchAvatar(session.user.userid, {
    type: "headshot",
    size: "180x180",
    circular: true,
  });

  const permissions = [
    ...new Set(
      session.user.roles.flatMap(
        (role) => role.permissions,
      ),
    ),
  ];

  if (
    session.user.isOwner ||
    session.user.roles.some(
      (role) => role.isOwnerRole,
    )
  ) {
    permissions.push("*");
  }

  const auth: AuthUser = {
    session: {
      id: session.id,
      token,
      expiresAt: session.expiresAt,
    },

    user: {
      userid: session.user.userid,
      username: session.user.username ?? "",
      picture: avatar,
      isOwner: session.user.isOwner ?? false,
      registered: session.user.registered ?? false,
    },

    permissions: [
      ...new Set(permissions),
    ],
  };

  await cache.set(
    `session:${token}`,
    auth,
    3600,
  );

  return auth;
}
