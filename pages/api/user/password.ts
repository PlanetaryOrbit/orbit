import type { AuthenticatedRequest } from '@/lib/withAuth';
import { withAuth } from '@/lib/withAuth';
import { invalidateUserProfileCache } from '@/utils/accountCache';
import { setSessionCookie } from '@/utils/authCookies';
import cache from '@/utils/cache';
import { validateCsrf } from '@/utils/csrf';
import prisma from '@/utils/database';
import { checkRateLimit, sendRateLimitExceeded } from '@/utils/rateLimit';
import { deleteOtherSessions, rotateSessionToken } from '@/utils/session';
import bcryptjs from 'bcryptjs';
import type { NextApiResponse } from 'next';

type ResponseBody = {
  success: boolean;
  error?: string;
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!(await checkRateLimit(req, 'password-change', 5, 15 * 60_000))) {
    return sendRateLimitExceeded(res);
  }

  if (!validateCsrf(req, res)) {
    return res.status(403).json({ success: false, error: 'Invalid request origin' });
  }

  const userId = req.auth.userId;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  const { currentPassword, newPassword } = req.body ?? {};

  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({
      success: false,
      error: 'New password must be between 8 and 128 characters',
    });
  }

  try {
    const info = await prisma.userInfo.findUnique({
      where: { userid: userId },
      select: { passwordhash: true },
    });

    if (info?.passwordhash) {
      if (typeof currentPassword !== 'string' || !currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Your current password is required',
        });
      }

      const matches = await bcryptjs.compare(currentPassword, info.passwordhash);
      if (!matches) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
    }

    const passwordhash = await bcryptjs.hash(newPassword, 12);

    await prisma.userInfo.upsert({
      where: { userid: userId },
      create: { userid: userId, passwordhash },
      update: { passwordhash },
    });

    await invalidateUserProfileCache(userId);
    await cache.del(`login:user:${userId}`);

    const rotated = await rotateSessionToken(req.auth.token);
    setSessionCookie(res, rotated.token);

    if (req.auth.session) {
      await deleteOtherSessions(userId, req.auth.session.id);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Password update error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update password' });
  }
}

export default withAuth(handler);
