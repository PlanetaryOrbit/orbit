// pages/api/workspace/[id]/activity/notices/update.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { withPermissionCheck } from '@/utils/permissionsManager';

type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, ['approve_notices', 'manage_notices']);

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!req.session.userid) {
    return res.status(401).json({ success: false, error: 'Not logged in' });
  }

  const { status, id, reviewComment } = req.body;

  if (!['approve', 'deny', 'cancel'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }

  if (status === 'cancel') {
    const workspaceId = parseInt(req.query.id as string);
    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(req.session.userid),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
      },
    });

    const membership = user?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const hasManagePermission = isAdmin || user?.roles.some(
      (role) => role.permissions.includes('manage_notices')
    );

    if (!hasManagePermission) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions. Canceling notices requires manage_notices permission.' });
    }
  }

  try {
    const notice = await prisma.inactivityNotice.findUnique({
      where: { id },
    });

    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    const before = notice;
    if (status === 'cancel') {
      await prisma.inactivityNotice.delete({
        where: { id },
      });
      try { await logAudit(notice.workspaceGroupId, (req as any).session?.userid || null, 'notice.cancel', `notice:${id}`, { before, after: null, reviewer: (req as any).session?.userid || null }); } catch (e) {}
    } else {
      const after = await prisma.inactivityNotice.update({
        where: { id },
        data: {
          approved: status === 'approve',
          reviewed: true,
          reviewComment: reviewComment || null,
        },
      });
      try { await logAudit(after.workspaceGroupId, (req as any).session?.userid || null, status === 'approve' ? 'notice.approve' : 'notice.deny', `notice:${id}`, { before, after, reviewer: (req as any).session?.userid || null }); } catch (e) {}
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[API ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
