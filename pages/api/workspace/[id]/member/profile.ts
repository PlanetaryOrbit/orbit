import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession';

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceGroupId = parseInt(req.query.id as string, 10);
  if (!workspaceGroupId) {
    return res.status(400).json({ success: false, error: 'Invalid workspace id' });
  }

  if (!req.session.userid) {
    return res.status(401).json({ success: false, error: 'Not logged in' });
  }

  const userId = BigInt(req.session.userid);

  if (req.method === 'GET') {
    try {
      const targetUserId = req.query.userId ? BigInt(req.query.userId as string) : userId;
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceGroupId_userId: {
            workspaceGroupId,
            userId: targetUserId,
          },
        },
        select: {
          userId: true,
          introMessage: true,
          trackId: true,
          trackName: true,
          artistName: true,
          artwork: true,
          previewUrl: true,
          joinDate: true,
          user: {
            select: {
              username: true,
              picture: true,
            },
          },
        },
      });

      if (!member) {
        return res.status(404).json({ success: false, error: 'Member not found' });
      }

      return res.status(200).json({
        success: true,
        profile: {
          userId: member.userId.toString(),
          username: member.user.username,
          picture: member.user.picture,
          introMessage: member.introMessage,
          trackId: member.trackId,
          trackName: member.trackName,
          artistName: member.artistName,
          artwork: member.artwork,
          previewUrl: member.previewUrl,
          joinDate: member.joinDate,
        },
      });
    } catch (error) {
      console.error('Error fetching member profile:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const { introMessage, trackId, trackName, artistName, artwork, previewUrl } = req.body;

      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceGroupId_userId: {
            workspaceGroupId,
            userId,
          },
        },
      });

      if (!member) {
        return res.status(404).json({ success: false, error: 'You are not a member of this workspace' });
      }

      const updated = await prisma.workspaceMember.update({
        where: {
          workspaceGroupId_userId: {
            workspaceGroupId,
            userId,
          },
        },
        data: {
          introMessage: introMessage !== undefined ? introMessage : undefined,
          trackId: trackId !== undefined ? trackId : undefined,
          trackName: trackName !== undefined ? trackName : undefined,
          artistName: artistName !== undefined ? artistName : undefined,
          artwork: artwork !== undefined ? artwork : undefined,
          previewUrl: previewUrl !== undefined ? previewUrl : undefined,
        },
        select: {
          userId: true,
          introMessage: true,
          trackId: true,
          trackName: true,
          artistName: true,
          artwork: true,
          previewUrl: true,
          user: {
            select: {
              username: true,
              picture: true,
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        profile: {
          userId: updated.userId.toString(),
          username: updated.user.username,
          picture: updated.user.picture,
          introMessage: updated.introMessage,
          trackId: updated.trackId,
          trackName: updated.trackName,
          artistName: updated.artistName,
          artwork: updated.artwork,
          previewUrl: updated.previewUrl,
        },
      });
    } catch (error) {
      console.error('Error updating member profile:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});