import { NextApiResponse } from 'next';

import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import cache from '@/utils/cache';
import { checkSpecificUser } from '@/utils/permissionsManager';

export default withAuth(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  if (!req.auth.userId) {
    return res.status(401).json({
      success: false,
      error: 'Not logged in',
    });
  }

  try {
    const cacheKey = `permissions:user:${req.auth.userId}`;

    const data = await cache.swr(
      cacheKey,
      async () => {
        return checkSpecificUser(req.auth.userId);
      },
      {
        freshFor: 30,
        staleFor: 300,
      },
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Permission check error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
