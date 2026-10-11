import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import cache from '@/utils/cache';
import prisma from '@/utils/database';
import { NextApiResponse } from 'next';

export default withAuth(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const cacheKey = `user:workspaces:${req.auth.userId}`;

  try {
    const data = await cache.swr(
      cacheKey,
      async () => {
        const user = await prisma.user.findFirst({
          where: {
            userid: req.auth.userId,
          },

          include: {
            workspaceMemberships: {
              include: {
                workspace: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error('User not found');
        }

        return user.workspaceMemberships.map((group) => ({
          groupId: group.workspaceGroupId,
          groupName: group.workspace.groupName,
          groupLogo: group.workspace.groupLogo,
          customName: group.workspace.customName,
        }));
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
    console.error('Workspace fetch error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
