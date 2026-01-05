import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

export default withSessionRoute(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const workspaceGroupId = parseInt(req.query.id as string, 10);
  const allyId = req.query.aid as string;

  if (!workspaceGroupId || !allyId) {
    return res.status(400).json({ success: false, error: 'Invalid parameters' });
  }

  const currentUserId = req.session?.userid;
  if (!currentUserId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const currentUser = await prisma.user.findFirst({
    where: {
      userid: BigInt(currentUserId),
    },
    include: {
      roles: {
        where: {
          workspaceGroupId,
        },
      },
      workspaceMemberships: {
        where: {
          workspaceGroupId,
        },
      },
    },
  });

  const membership = currentUser?.workspaceMemberships?.[0];
  const isAdmin = membership?.isAdmin || false;
  const canEditAllianceDetails = isAdmin ||
    (currentUser?.roles?.some((role) =>
      role.permissions?.includes("edit_alliance_details")
    ) ?? false);

  const alliance = await prisma.ally.findFirst({
    where: {
      id: allyId,
      workspaceGroupId,
    },
    include: {
      reps: true,
    },
  });

  if (!alliance) {
    return res.status(404).json({ success: false, error: 'Alliance not found' });
  }

  const isRep = alliance.reps.some(rep => rep.userid === BigInt(currentUserId));

  if (!canEditAllianceDetails && !isRep) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }

  const { discordServer, ourReps, theirReps } = req.body;

  try {
    if (discordServer && discordServer.trim()) {
      const urlPattern = /^(https?:\/\/)?(discord\.gg\/|discord\.com\/invite\/)/;
      if (!urlPattern.test(discordServer.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Discord server must be a valid Discord invite link'
        });
      }
    }

    let ourRepUsernames: string[] = [];
    if (Array.isArray(ourReps) && ourReps.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          userid: { in: ourReps.map((id: any) => BigInt(id)) }
        },
        select: { userid: true, username: true }
      });
      ourRepUsernames = users.map(user => user.username || user.userid.toString());
    }

    const updatedAlly = await prisma.ally.update({
      where: {
        id: allyId,
      },
      data: {
        discordServer: discordServer?.trim() || null,
        reps: {
          set: ourReps?.map((userId: any) => ({
            userid: BigInt(userId)
          })) || []
        },
        theirReps: Array.isArray(theirReps) ? theirReps.filter((rep: string) => rep.trim()) : [],
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Alliance information updated!',
      ally: updatedAlly,
    });
  } catch (error) {
    console.error('Error updating alliance:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});