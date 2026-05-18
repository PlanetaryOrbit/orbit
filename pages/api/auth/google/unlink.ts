import type { NextApiRequest, NextApiResponse } from 'next';
// import { withAuth } from '@/lib/withSession';
import prisma from '@/utils/database';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';

export default withAuth(handler);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.auth.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const robloxUserId = BigInt(req.auth.userId);

    const gEntry = await prisma.googleUser.findFirst({
      where: { robloxUserId },
    });

    if (!gEntry) {
      return res.status(404).json({ error: 'No Google account linked' });
    }

    await prisma.googleUser.delete({
      where: { googleUserId: gEntry.googleUserId },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Google unlink error:', err);
    return res.status(500).json({ error: 'Failed to unlink Google account' });
  }
}
