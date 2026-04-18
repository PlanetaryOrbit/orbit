// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession';

export default withSessionRoute(handler);

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
  if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not authenticated' });
  try {
    await prisma.user.update({
      where: {
        userid: req.session.userid
      },
      data: {
        isFirstLogin: false
      }
    });
    return res.status(200).send({ success: true, message: "Updated."})
  } catch (err){
    console.error("firstLogin error:", err)
    return res.status(500).send({ success: false, error: "Internal Server Error"})
  }
}
