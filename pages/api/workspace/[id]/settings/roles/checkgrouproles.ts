import type { NextApiRequest, NextApiResponse } from 'next';

import { withAuth } from '@/lib/withAuth';
import cache from '@/utils/cache';
import { checkGroupRoles } from '@/utils/permissionsManager';

export default withAuth(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const workspaceId = parseInt(req.query.id as string);

    if (isNaN(workspaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workspace ID',
      });
    }

    const roles = await checkGroupRoles(workspaceId);

    const roleCacheKey = `workspace:${workspaceId}:roles`;

    await cache.del(roleCacheKey);
    await cache.set(roleCacheKey, roles, 300);

    return res.status(200).json({
      success: true,
      roles,
    });
  } catch (error) {
    console.error('Error in checkgrouproles handler:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to sync group roles',
    });
  }
}
