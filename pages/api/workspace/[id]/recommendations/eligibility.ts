import type { NextApiRequest, NextApiResponse } from 'next';

import { withAuth } from '@/lib/withAuth';
import { getRecommendationEligibility } from '@/utils/recommendations';

type Data = {
  success: boolean;
  error?: string;
  eligibility?: {
    enabled: boolean;
    hasPermission: boolean;
    recommenderRank: number;
    targetRank: number;
    canRecommend: boolean;
    reason: string | null;
  };
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const userId = (req as any).auth?.userId as bigint | undefined;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  const workspaceGroupId = Number.parseInt(req.query.id as string, 10);
  const targetId = Number.parseInt(req.query.target as string, 10);

  if (
    !Number.isSafeInteger(workspaceGroupId) ||
    workspaceGroupId <= 0 ||
    !Number.isSafeInteger(targetId) ||
    targetId <= 0
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request.',
    });
  }

  const eligibility = await getRecommendationEligibility(
    userId,
    BigInt(targetId),
    workspaceGroupId,
  );

  return res.status(200).json({
    success: true,
    eligibility,
  });
}

export default withAuth(handler);
