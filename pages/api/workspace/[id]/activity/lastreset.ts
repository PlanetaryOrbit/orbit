import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager';

type Data = {
  success: boolean;
  lastReset?: any;
  error?: string;
};

export default withPermissionCheck(handler);

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const workspaceGroupId = Number(req.query.id as string);

  try {
    const lastReset = await prisma.activityReset.findFirst({
      where: { workspaceGroupId },
      orderBy: { resetAt: 'desc' },
      include: {
        resetBy: {
          select: {
            username: true,
            picture: true,
          }
        }
      }
    });

    if (!lastReset) {
      return res.status(200).json({ success: true, lastReset: null });
    }

    const serializedReset = JSON.parse(
      JSON.stringify(lastReset, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return res.status(200).json({ success: true, lastReset: serializedReset });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}