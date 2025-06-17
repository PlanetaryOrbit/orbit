// pages/api/workspace/[id]/activity/notices/update.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager';

type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, 'manage_activity');

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

  const { status, id } = req.body;

  if (!['approve', 'deny', 'cancel'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }

  try {
    const notice = await prisma.inactivityNotice.findUnique({
      where: { id },
    });

    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    if (status === 'cancel') {
      await prisma.inactivityNotice.delete({
        where: { id },
      });
    } else {
      await prisma.inactivityNotice.update({
        where: { id },
        data: {
          approved: status === 'approve',
          reviewed: true,
        },
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[API ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
