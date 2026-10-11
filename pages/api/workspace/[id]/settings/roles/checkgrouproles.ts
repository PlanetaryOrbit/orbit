import cache from '@/utils/cache';
import { withPermissionCheck, checkGroupRoles } from '@/utils/permissionsManager';
import type { NextApiRequest, NextApiResponse } from 'next';

export default withPermissionCheck(handler, 'admin');

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const workspaceId = parseInt(req.query.id as string, 10);

    if (isNaN(workspaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workspace ID',
      });
    }

    const roles = await checkGroupRoles(workspaceId);

    if (!Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        error: 'Sync did not run',
      });
    }

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
