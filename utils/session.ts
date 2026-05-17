import * as crypto from 'crypto'
import prisma from '@/utils/database'

function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

async function createSession(userId: bigint, ipAddress?: string, userAgent?: string) {
  const session = await prisma.authSession.create({
    data: {
      id: crypto.randomUUID(),
      token: generateToken(),
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 day expiry
      ipAddress: ipAddress ? hash(ipAddress) : "",
      userAgent: userAgent ? hash(userAgent) : ""
    },
    include: {
      user: true
    }
  })

  return session
}

async function getSessionByToken(token: string) {
  const session = await prisma.authSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.authSession.delete({ where: { token } })
    return null
  }

  return session
}

async function refreshSession(token: string, days = 30) {
  return prisma.authSession.update({
    where: { token },
    data: {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
}

async function rotateSessionToken(token: string) {
  return prisma.authSession.update({
    where: { token },
    data: {
      token: generateToken(),
      updatedAt: new Date(),
    },
  })
}

async function deleteSession(token: string) {
  return prisma.authSession.delete({
    where: { token },
  })
}


async function deleteAllUserSessions(userId: bigint) {
  return prisma.authSession.deleteMany({
    where: { userId },
  })
}


async function deleteOtherSessions(userId: bigint, currentToken: string) {
  return prisma.authSession.deleteMany({
    where: {
      userId,
      NOT: { token: currentToken },
    },
  })
}

async function listActiveSessions(userId: bigint) {
  return prisma.authSession.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
}

async function purgeExpiredSessions() {
  const { count } = await prisma.authSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  console.log(`Purged ${count} expired sessions.`)
  return count
}

export { createSession, getSessionByToken, refreshSession, rotateSessionToken, deleteSession, deleteOtherSessions, deleteAllUserSessions, listActiveSessions, purgeExpiredSessions}