import { withKey } from '@/lib/withAuth';
import prisma from '@/utils/database';
import type { NextApiRequest, NextApiResponse } from 'next';

export default withKey(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { userid } = req.query;

  if (typeof userid !== 'string' || !userid) {
    return res.status(400).send({
      success: false,
      error: 'No User ID provided.',
    });
  }

  const workspaceId = Number.parseInt(
    Array.isArray(req.query.id) ? req.query.id[0] : (req.query.id as string),
    10,
  );
  if (!workspaceId) {
    return res.status(400).json({ success: false, error: 'Missing workspace ID' });
  }

  let parsedUserId: bigint;
  try {
    parsedUserId = BigInt(userid);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid User ID.' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        userid: parsedUserId,
      },
      include: {
        workspaceMemberships: { where: { workspaceGroupId: workspaceId } },
        ranks: { where: { workspaceGroupId: workspaceId } },
        inactivityNotices: { where: { workspaceGroupId: workspaceId } },
        activitySessions: { where: { workspaceGroupId: workspaceId } },
        activityHistory: { where: { workspaceGroupId: workspaceId } },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User does not exist.',
      });
    }

    return res.status(200).send({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error in public API:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
