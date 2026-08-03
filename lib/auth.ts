/**
 * Orbit API
 *
 * Authentication helpers.
 *
 * Reads the Orbit session cookie and returns the authenticated user.
 *
 * @module lib/auth
 * @since 3.0.0
 * @author BuddyWinte
 */

import { cookies } from "next/headers";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";

export interface AuthUser {
  id: string;
  username: string;
}

export async function authenticate(): Promise<AuthUser | null> {
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get("orbit_session")?.value;

  if (!sessionToken) {
    return null;
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session.user;
}
