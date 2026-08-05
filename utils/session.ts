/**
 * Orbit API
 *
 * Authentication session management.
 *
 * @module utils/session
 * @since 2.1.10beta21
 * @author BuddyWinte
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

function generateToken() {
  return `orbit_${crypto.randomBytes(48).toString("hex")}`;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = generateToken();

  const session = await prisma.session.create({
    data: {
      id: crypto.randomUUID(),

      userId,

      tokenHash: hashToken(token),

      expiresAt: new Date(Date.now() + SESSION_DURATION),
    },

    include: {
      user: true,
    },
  });

  return {
    ...session,
    token,
  };
}

export async function getSessionByToken(token: string) {
  if (!token.startsWith("orbit_")) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(token),
    },

    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session
      .delete({
        where: {
          id: session.id,
        },
      })
      .catch(() => null);

    return null;
  }

  return {
    ...session,
    token,
  };
}

export async function deleteSession(token: string) {
  return prisma.session
    .delete({
      where: {
        tokenHash: hashToken(token),
      },
    })
    .catch(() => null);
}

export async function deleteAllUserSessions(userId: string) {
  return prisma.session.deleteMany({
    where: {
      userId,
    },
  });
}

export async function refreshSession(token: string, days = 30) {
  return prisma.session.update({
    where: {
      tokenHash: hashToken(token),
    },

    data: {
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  });
}

export async function purgeExpiredSessions() {
  return prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
