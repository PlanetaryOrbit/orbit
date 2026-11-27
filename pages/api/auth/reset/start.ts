import prisma from '@/utils/database';
import { checkRateLimit, sendRateLimitExceeded } from '@/utils/rateLimit';
import { getRobloxThumbnail, getRobloxDisplayName } from '@/utils/roblox';
import { generateVerificationCode } from '@/utils/verification';
import type { NextApiRequest, NextApiResponse } from 'next';
import * as noblox from 'noblox.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (!(await checkRateLimit(req, 'reset-start', 5, 15 * 60_000))) {
    return sendRateLimitExceeded(res);
  }

  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: 'Missing username' });

  const existingUser = await prisma.user.findFirst({ where: { username } });
  if (!existingUser)
    return res.status(400).json({ success: false, error: 'User is not registered' });

  const authid = (await noblox.getIdFromUsername(username).catch(() => null)) as number | undefined;
  if (!authid) return res.status(404).json({ success: false, error: 'Roblox user not found' });

  const verificationCode = generateVerificationCode();

  await prisma.verificationState.deleteMany({
    where: { userId: BigInt(authid), isReset: true },
  });

  await prisma.verificationState.create({
    data: {
      code: verificationCode,
      userId: BigInt(authid),
      isReset: true,
    },
  });

  const [thumbnail, displayName] = await Promise.all([
    getRobloxThumbnail(authid).catch(() => ''),
    getRobloxDisplayName(authid).catch(() => username),
  ]);

  res.status(200).json({
    success: true,
    userId: existingUser.userid.toString(),
    code: verificationCode,
    thumbnail: thumbnail || undefined,
    displayName: displayName || username,
  });
}
