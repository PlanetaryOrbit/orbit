import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
import { invalidateUserProfileCache } from '@/utils/accountCache';
import { validateCsrf } from '@/utils/csrf';
import prisma from '@/utils/database';
import type { NextApiResponse } from 'next';

export default withAuth(handler);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!validateCsrf(req, res)) {
    return res.status(403).json({ error: 'Invalid request origin' });
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

    await invalidateUserProfileCache(robloxUserId);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Google unlink error:', err);
    return res.status(500).json({ error: 'Failed to unlink Google account' });
  }
}
