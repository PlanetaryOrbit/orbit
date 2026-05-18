import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import * as noblox from 'noblox.js'
import { getRobloxThumbnail } from '@/utils/roblox';
import { getUsername, getDisplayName } from '@/utils/userinfoEngine';

type Data = {
  success: boolean
  error?: string
  code?: string
  userid?: number
  thumbnail?: string
  displayName?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, error: 'Missing username' })

  const userid = await noblox.getIdFromUsername(username).catch(() => null) as number | undefined;
  if (!userid) return res.status(404).json({ success: false, error: 'Username not found' })

  const existingUser = await prisma.user.findUnique({
    where: { userid: BigInt(userid) },
    select: { registered: true, info: { select: { passwordhash: true } } }
  });

  if (existingUser?.registered || existingUser?.info?.passwordhash) {
    return res.status(400).json({
      success: false,
      error: `User ${username} is already registered. Please use the login form instead.`
    });
  }

  const array = ['📋', '🎉', '🎂', '📆', '✔️', '📃', '👍', '➕', '📢', '🐒', '🐴', '🐑', '🐘', '🐼', '🐧', '🐦', '🐤', '🐥', '🐣', '🐔', '🐍', '🐢', '🐛', '🐝', '🐜', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📚', '📖', '🔖', '🎯', '🏈', '🏀', '⚽', '⚾', '🎾', '🎱', '🏉', '🎳', '⛳', '🚵', '🚴', '🏁', '🏇']
  const code = `🤖${Array.from({ length: 11 }, () => array[Math.floor(Math.random() * array.length)]).join('')}`;

  await prisma.validationState.deleteMany({
    where: { userId: userid }
  });

  await prisma.validationState.create({
    data: { userId: userid, code }
  });

  const [thumbnail, displayName] = await Promise.all([
    getRobloxThumbnail(userid).catch(() => ''),
    getDisplayName(userid).catch(() => username),
  ]);

  res.status(200).json({ success: true, code, userid, thumbnail: thumbnail || undefined, displayName })
}