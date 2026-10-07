import { NextApiResponse } from 'next';

import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { deleteMedia } from '@/utils/media';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  const userId = req.auth.userId;
  const groupId = parseInt(req.query.id as string);
  const postId = parseInt(req.query.postId as string);

  if (!userId || isNaN(groupId) || isNaN(postId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request',
    });
  }

  const post = await prisma.wallPost.findUnique({
    where: {
      id: postId,
    },
    include: {
      media: true,
    },
  });

  if (!post || post.workspaceGroupId !== groupId) {
    return res.status(404).json({
      success: false,
      error: 'Post not found',
    });
  }

  const user = await prisma.user.findUnique({
    where: {
      userid: BigInt(userId),
    },
    include: {
      roles: {
        where: {
          workspaceGroupId: groupId,
        },
      },
      workspaceMemberships: {
        where: {
          workspaceGroupId: groupId,
        },
      },
    },
  });

  const membership = user?.workspaceMemberships?.[0];

  const isAdmin = membership?.isAdmin || false;
  const isOwner = post.authorId === BigInt(userId);
  const hasPermission =
    user?.roles?.some((role) => role.permissions.includes('delete_wall_posts')) || false;
  const isInstanceOwner = user?.isOwner === true;

  if (!isOwner && !hasPermission && !isInstanceOwner && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized',
    });
  }

  const mediaId = post.mediaId;

  await prisma.wallPost.delete({
    where: {
      id: postId,
    },
  });

  if (mediaId) {
    try {
      await deleteMedia(mediaId);
    } catch (error) {
      console.error(`[Wall] Failed to delete media ${mediaId} for post ${postId}`, error);
    }
  }

  console.log(`[Wall] Post ${postId} deleted by user ${userId} in workspace ${groupId}`);

  try {
    await logAudit(groupId, Number(userId), 'wall.post.delete', `wallpost:${postId}`, {
      id: postId,
    });
  } catch {}

  return res.status(200).json({
    success: true,
  });
}

export default withAuth(handler);
