import prisma from '@/utils/database';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userCount = await prisma.user.count();
  return res.status(200).json({ userCount });
}
