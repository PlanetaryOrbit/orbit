import type {
  NextApiRequest,
  NextApiResponse,
} from 'next'

import crypto from 'crypto'

import prisma from '@/utils/database'

function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
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