import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import * as noblox from 'noblox.js';
import bcryptjs from 'bcryptjs';
import { getRobloxThumbnail } from '@/utils/roblox';
import { createSession } from '@/utils/session';

type Data = {
  success: boolean
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { code, userid, password } = req.body;

  if (!code || !userid || !password) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (password.length < 7) {
    return res.status(400).json({ success: false, error: 'Password must be at least 7 characters long.' });
  }

  if (!/[0-9!@#$%^&*]/.test(password)) {
    return res.status(400).json({ success: false, error: 'Password must contain at least one number or special character.' });
  }

  const validationState = await prisma.validationState.findFirst({
    where: { userId: userid, code }
  });

  if (!validationState) {
    return res.status(400).json({ success: false, error: 'Verification session not found or expired. Please start again.' });
  }

  let blurb: string;
  try {
    blurb = await noblox.getBlurb(userid);
  } catch {
    return res.status(400).json({ success: false, error: 'Unable to verify your Roblox profile. Please ensure your profile is public.' });
  }

  if (!blurb.trim().normalize('NFC').includes(code.trim().normalize('NFC'))) {
    return res.status(400).json({ success: false, error: 'Verification code not found in your Roblox bio. Please paste the exact code and try again.' });
  }

  try {
    const hashedPassword = await bcryptjs.hash(password, 10);
    const thumbnail = (await getRobloxThumbnail(userid).catch(() => undefined)) || undefined;
    const username = await noblox.getUsernameFromId(userid).catch(() => undefined);

    await prisma.user.upsert({
      where: { userid: BigInt(userid) },
      update: {
        username: username || undefined,
        picture: thumbnail,
        registered: true,
        info: {
          upsert: {
            create: { passwordhash: hashedPassword },
            update: { passwordhash: hashedPassword },
          },
        },
      },
      create: {
        userid: BigInt(userid),
        username: username || undefined,
        picture: thumbnail,
        registered: true,
        info: {
          create: { passwordhash: hashedPassword },
        },
      },
    });

    await prisma.validationState.deleteMany({ where: { userId: userid } });

    const ipAddress = (
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress
    ) as string;

    const session = await createSession(
      BigInt(userid),
      ipAddress,
      req.headers['user-agent']
    );

    res.setHeader('Set-Cookie', `session_token=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Signup finish error:', error);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred. Please try again.' });
  }
}