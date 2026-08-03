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
import { UAParser } from "ua-parser-js";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

function generateToken() {
  return `orbit_${crypto.randomBytes(48).toString("hex")}`;
}

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function parseUserAgent(userAgent?: string) {
  if (!userAgent) {
    return {
      browser: null,
      os: null,
      device: null,
    };
  }

  const result = new UAParser(userAgent).getResult();

  return {
    browser:
      [result.browser.name, result.browser.version]
        .filter(Boolean)
        .join(" ") || null,

    os:
      [result.os.name, result.os.version]
        .filter(Boolean)
        .join(" ") || null,

    device:
      result.device.type ??
      "desktop",
  };
}

export async function createSession(
  userId: bigint,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  const token = generateToken();

  const metadata = parseUserAgent(
    options?.userAgent ?? undefined,
  );

  const session = await prisma.authSession.create({
    data: {
      id: crypto.randomUUID(),

      userId,

      token: hashToken(token),

      ipAddress:
        options?.ipAddress ?? null,

      userAgent:
        options?.userAgent ?? null,

      browser: metadata.browser,
      os: metadata.os,
      device: metadata.device,

      expiresAt: new Date(
        Date.now() + SESSION_DURATION,
      ),
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


export async function getSessionByToken(
  token: string,
) {
  if (!token.startsWith("orbit_")) {
    return null;
  }

  const session =
    await prisma.authSession.findUnique({
      where: {
        token: hashToken(token),
      },

      include: {
        user: true,
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
    }).catch(() => null);

    return null;
  }


  return {
    ...session,
    token,
  };
}


export async function deleteSession(
  token: string,
) {
  return prisma.authSession.delete({
    where: {
      token: hashToken(token),
    },
  }).catch(() => null);
}


export async function deleteAllUserSessions(
  userId: bigint,
) {
  return prisma.authSession.deleteMany({
    where: {
      userId,
    },
  });
}


export async function refreshSession(
  token: string,
  days = 30,
) {
  return prisma.authSession.update({
    where: {
      token: hashToken(token),
    },

    data: {
      expiresAt: new Date(
        Date.now() +
        days * 24 * 60 * 60 * 1000,
      ),
    },
  });
}


export async function purgeExpiredSessions() {
  return prisma.authSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}
