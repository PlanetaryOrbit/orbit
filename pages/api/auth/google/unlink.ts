import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

export default withSessionRoute(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.session.userid) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const robloxUserId = BigInt(req.session.userid);

    const gEntry = await prisma.googleUser.findFirst({
      where: { robloxUserId },
    });

    if (!gEntry) {
      return res.status(404).json({ error: 'No Google account linked' });
    }

    await prisma.googleUser.delete({
      where: { googleUserId: gEntry.googleUserId },
    });

    delete req.session.googleid;
    await req.session.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Google unlink error:', err);
    return res.status(500).json({ error: 'Failed to unlink Google account' });
  }
}
