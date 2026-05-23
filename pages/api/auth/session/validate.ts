import type {
  NextApiRequest,
  NextApiResponse,
} from 'next'

import crypto from 'crypto'

import prisma from '@/utils/database'

function hashToken(token: string): string {
  // Remove DONOTSHARE_ prefix before hashing if present
  const cleanToken = token.replace(/^DONOTSHARE_/i, '')
  return crypto
    .createHash('sha256')
    .update(cleanToken)
    .digest('hex')
}

function validateTokenFormat(token: string): boolean {
  // Validate token starts with DONOTSHARE_ followed by 64 hex characters
  return /^DONOTSHARE_[a-f0-9]{64}$/i.test(token)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = req.headers.authorization?.replace(
    'Bearer ',
    ''
  )

  if (!token) {
    return res.status(401).json({
      error: 'No token',
    })
  }

  if (!validateTokenFormat(token)) {
    return res.status(401).json({
      error: 'Invalid token format',
    })
  }

  const hashedToken = hashToken(token)

  const session = await prisma.authSession.findUnique({
    where: {
      token: hashedToken,
    },

    include: {
      user: true,
    },
  })

  if (!session) {
    return res.status(401).json({
      error: 'Invalid session',
    })
  }

  if (session.expiresAt < new Date()) {
    await prisma.authSession
      .delete({
        where: {
          token: hashedToken,
        },
      })
      .catch(() => null)

    return res.status(401).json({
      error: 'Expired session',
    })
  }

  return res.status(200).json({
    userId: session.userId.toString(),
  })
}