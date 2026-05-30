import * as crypto from 'crypto'
import prisma from '@/utils/database'
import { UAParser } from 'ua-parser-js'

const SESSION_SECRET = process.env.SESSION_SECRET!

function generateToken(): string {
  const token = crypto.randomBytes(32).toString('hex')
  return `DONOTSHARE_${token}`
}

function hashToken(token: string): string {
  const cleanToken = token.replace(/^DONOTSHARE_/i, '')
  return crypto
    .createHash('sha256')
    .update(cleanToken)
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
  const parts = value.split(':')
  if (parts.length !== 3) return value

  const [ivHex, tagHex, encryptedHex] = parts

  try {
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
  } catch {
    return null
  }
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
  const isValidDontShare = /^DONOTSHARE_[a-f0-9]{64}$/i.test(token)
  if (!isValidDontShare) return null

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
    token: token,
    ipAddress: decrypt(session.ipAddress),
    userAgent: decrypt(session.userAgent),
  }
}

async function refreshSession(token: string, days = 30) {
  const isValidDontShare = /^DONOTSHARE_[a-f0-9]{64}$/i.test(token)
  if (!isValidDontShare) throw new Error('Invalid token format')

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
  const isValidDontShare = /^DONOTSHARE_[a-f0-9]{64}$/i.test(token)
  if (!isValidDontShare) throw new Error('Invalid token format')

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
  const isValidDontShare = /^DONOTSHARE_[a-f0-9]{64}$/i.test(token)
  if (!isValidDontShare) return null

  return prisma.authSession
    .delete({
      where: {
        token: hashToken(token),
      },
    })
    .catch(() => null)
}

async function forceDeleteSession(id: string) {
  return prisma.authSession
    .delete({
      where: {
        id: id,
      },
    })
    .catch((err) => { console.error('Error deleting session:', err) })
}

async function deleteAllUserSessions(userId: bigint) {
  return prisma.authSession.deleteMany({
    where: { userId },
  })
}

async function deleteOtherSessions(
  userId: bigint,
  sid: string
) {

  return prisma.authSession.deleteMany({
    where: {
      userId,
      NOT: {
        id: sid,
      },
    },
  })
}

async function listActiveSessions(userId: bigint) {
  const sessions = await prisma.authSession.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      browser: true,
      os: true,
      device: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  const results = []

  for (const session of sessions) {
    try {
      results.push({
        ...session,
        ipAddress: decrypt(session.ipAddress),
        userAgent: decrypt(session.userAgent),
      })
    } catch {
      await prisma.authSession.delete({ where: { id: session.id } }).catch(() => null)
    }
  }

  return results
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
  forceDeleteSession,
  deleteSession,
  deleteOtherSessions,
  deleteAllUserSessions,
  listActiveSessions,
  purgeExpiredSessions,
}