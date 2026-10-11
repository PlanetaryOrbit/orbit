import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import cache from '@/utils/cache';
import prisma from '@/utils/database';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  error?: string;
  isOwner?: boolean;
};

export default withAuth(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!req.auth.session?.userId) {
    return res.status(401).json({
      success: false,
      error: 'Not logged in',
    });
  }

  try {
    const cacheKey = `user:owner:${req.auth.userId}`;

    const isOwner = await cache.swr<boolean>(
      cacheKey,
      async () => {
        const user = await prisma.user.findUnique({
          where: {
            userid: req.auth.userId,
          },
          select: {
            isOwner: true,
          },
        });

        if (!user) throw new Error('User not found');

        return user.isOwner ?? false;
      },
      {
        freshFor: 60,
        staleFor: 600,
      },
    );

    return res.status(200).json({
      success: true,
      isOwner,
    });
  } catch (error) {
    console.error('Error checking workspace ownership:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
