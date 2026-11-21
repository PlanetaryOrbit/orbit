import type { AuthenticatedRequest } from '@/lib/withAuth';
import { withAuth } from '@/lib/withAuth';
import { invalidateUserProfileCache } from '@/utils/accountCache';
import cache from '@/utils/cache';
import { validateCsrf } from '@/utils/csrf';
import prisma from '@/utils/database';
import { clearUserCache } from '@/utils/userinfoEngine';
import type { NextApiResponse } from 'next';

type ResponseBody = {
  success: boolean;
  error?: string;
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!validateCsrf(req, res)) {
    return res.status(403).json({ success: false, error: 'Invalid request origin' });
  }

  const userId = req.auth.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { userid: userId },
      select: { userid: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    clearUserCache(userId);
    await Promise.all([invalidateUserProfileCache(userId), cache.del(`roblox:user:${userId}`)]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Profile refresh error:', error);
    return res.status(500).json({ success: false, error: 'Failed to refresh profile' });
  }
}

export default withAuth(handler);
