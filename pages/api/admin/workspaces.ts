import { withInstanceAuth, type AuthenticatedRequest } from '@/lib/withAuth';
import prisma from '@/utils/database';
import type { NextApiResponse } from 'next';

export default withInstanceAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userid: req.auth.userId },
      select: { isOwner: true },
    });

    if (!user?.isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Instance owner access required',
      });
    }

    const workspaces = await prisma.workspace.findMany({
      select: {
        groupId: true,
        groupName: true,
        groupLogo: true,
        memberCount: true,
      },
      orderBy: { groupName: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    console.error('Failed to fetch instance workspaces:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});
