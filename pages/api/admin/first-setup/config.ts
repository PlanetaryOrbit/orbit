import { createHmac } from 'crypto';

import { safeEqual } from '@/lib/security';
import prisma from '@/utils/database';
import type { NextApiRequest, NextApiResponse } from 'next';

const INTERNAL_SETUP_CHECK_MESSAGE = 'orbit-setup-check';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = createHmac('sha256', process.env.SESSION_SECRET ?? '')
    .update(INTERNAL_SETUP_CHECK_MESSAGE)
    .digest('hex');
  const supplied = req.headers['x-internal-setup-check'];
  if (typeof supplied !== 'string' || !safeEqual(supplied, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userCount = await prisma.user.count();
  return res.status(200).json({ userCount });
}
