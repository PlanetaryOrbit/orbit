import { withAuth } from '@/lib/withAuth';
import { getConfig, setConfig } from '@/utils/configEngine';
import { logAudit } from '@/utils/logs';
import { withPermissionCheck } from '@/utils/permissionsManager';
import {
  getRecommendationConfig,
  parseRecommendationConfig,
  recommendationConfigKey,
} from '@/utils/recommendations';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  success: boolean;
  error?: string;
  value?: {
    enabled: boolean;
    ranks: number[];
  };
};

export default withAuth(handler);

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const userId = (req as any).auth?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  const workspaceGroupId = Number.parseInt(req.query.id as string, 10);

  if (!Number.isSafeInteger(workspaceGroupId) || workspaceGroupId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid workspace ID',
    });
  }

  if (req.method === 'GET') {
    const config = await getRecommendationConfig(workspaceGroupId);

    return res.status(200).json({
      success: true,
      value: config,
    });
  }

  if (req.method === 'PATCH') {
    return withPermissionCheck(async (request: NextApiRequest, response: NextApiResponse<Data>) => {
      const body = request.body as {
        enabled?: unknown;
        ranks?: unknown;
      };

      if (typeof body.enabled !== 'boolean') {
        return response.status(400).json({
          success: false,
          error: 'enabled must be a boolean.',
        });
      }

      if (!Array.isArray(body.ranks)) {
        return response.status(400).json({
          success: false,
          error: 'ranks must be an array.',
        });
      }

      const ranks = body.ranks
        .filter((rank): rank is number => typeof rank === 'number' && Number.isInteger(rank))
        .filter((rank) => rank >= 1 && rank <= 255);

      if (ranks.length !== body.ranks.length) {
        return response.status(400).json({
          success: false,
          error: 'All ranks must be integers between 1 and 255.',
        });
      }

      const nextConfig = {
        enabled: body.enabled,
        ranks: [...new Set(ranks)].sort((a, b) => a - b),
      };

      const before = parseRecommendationConfig(
        await getConfig(recommendationConfigKey, workspaceGroupId),
      );

      await setConfig(recommendationConfigKey, nextConfig, workspaceGroupId);

      await logAudit(
        workspaceGroupId,
        (request as any).auth?.userId || null,
        'settings.general.recommendations.update',
        'recommendations',
        {
          before,
          after: nextConfig,
        },
      );

      return response.status(200).json({
        success: true,
        value: nextConfig,
      });
    }, 'manage_features')(req, res);
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}
