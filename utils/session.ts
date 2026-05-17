import * as crypto from 'crypto'
import prisma from '@/utils/database'
import { UAParser } from 'ua-parser-js'

const SESSION_SECRET = process.env.SESSION_SECRET!

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

function getKey() {
  return crypto
    .createHash('sha256')
    .update(SESSION_SECRET)
    .digest()
}

function encrypt(value?: string | null): string | null {
  if (!value) return null

  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    getKey(),
    iv
  )

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

function decrypt(value?: string | null): string | null {
  if (!value) return null

  const [ivHex, tagHex, encryptedHex] = value.split(':')

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivHex, 'hex')
  )

  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

function parseUA(userAgent?: string) {
  if (!userAgent) {
    return {
      browser: null,
      os: null,
      device: null,
    }
  }

  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  return {
    browser:
      [result.browser.name, result.browser.version]
        .filter(Boolean)
        .join(' ') || null,

    os:
      [result.os.name, result.os.version]
        .filter(Boolean)
        .join(' ') || null,

    device: result.device.type ?? 'desktop',
  }
}

async function createSession(
  userId: bigint,
  ipAddress?: string,
  userAgent?: string
) {
  const rawToken = generateToken()

  const { browser, os, device } = parseUA(userAgent)

  const session = await prisma.authSession.create({
    data: {
      id: crypto.randomUUID(),
      token: hashToken(rawToken),
      userId,
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
      ipAddress: encrypt(ipAddress),
      userAgent: encrypt(userAgent),
      browser,
      os,
      device,
    },

    include: {
      user: true,
    },
  })

  return {
    ...session,
    token: rawToken,
  }
}

async function getSessionByToken(token: string) {
  const hashedToken = hashToken(token)

  const session = await prisma.authSession.findUnique({
    where: {
      token: hashedToken,
    },

    include: {
      user: true,
    },
  })

  if (!session) return null

  if (session.expiresAt < new Date()) {
    await prisma.authSession
      .delete({
        where: {
          token: hashedToken,
        },
      })
      .catch(() => null)

    return null
  }

  return {
    ...session,

    ipAddress: decrypt(session.ipAddress),
    userAgent: decrypt(session.userAgent),
  }
}

async function refreshSession(token: string, days = 30) {
  return prisma.authSession.update({
    where: {
      token: hashToken(token),
    },

    data: {
      expiresAt: new Date(
        Date.now() + days * 24 * 60 * 60 * 1000
      ),
    },
  })
}

async function rotateSessionToken(token: string) {
  const newToken = generateToken()

  const session = await prisma.authSession.update({
    where: {
      token: hashToken(token),
    },

    data: {
      token: hashToken(newToken),
      updatedAt: new Date(),
    },
  })

  return {
    ...session,
    token: newToken,
  }
}

async function deleteSession(token: string) {
  return prisma.authSession
    .delete({
      where: {
        token: hashToken(token),
      },
    })
    .catch(() => null)
}

async function deleteAllUserSessions(userId: bigint, token: string) {
  return prisma.authSession.deleteMany({
    where: {
      userId,
      token: {
        not: token
      }
    },
  })
}

async function deleteOtherSessions(
  userId: bigint,
  currentToken: string
) {
  return prisma.authSession.deleteMany({
    where: {
      userId,

      NOT: {
        token: hashToken(currentToken),
      },
    },
  })
}

async function listActiveSessions(userId: bigint) {
  const sessions = await prisma.authSession.findMany({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      token: true,
      browser: true,
      os: true,
      device: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  return sessions.map((session) => ({
    ...session,

    ipAddress: decrypt(session.ipAddress),
    userAgent: decrypt(session.userAgent),
  }))
}

async function purgeExpiredSessions() {
  const { count } = await prisma.authSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })

  console.log(`Purged ${count} expired sessions.`)

  return count
}

export {
  createSession,
  getSessionByToken,
  refreshSession,
  rotateSessionToken,
  deleteSession,
  deleteOtherSessions,
  deleteAllUserSessions,
  listActiveSessions,
  purgeExpiredSessions,
}