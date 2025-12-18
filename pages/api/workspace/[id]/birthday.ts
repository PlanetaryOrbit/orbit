import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  const workspaceGroupId = parseInt(req.query.id as string, 10);
  if (!workspaceGroupId) return res.status(400).json({ success: false, error: 'Invalid workspace id' });
  const userid = req.session.userid ? Number(req.session.userid) : null;
  if (!userid) return res.status(401).json({ success: false, error: 'Not logged in' });

  if (req.method === 'GET') {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceGroupId_userId: { workspaceGroupId, userId: userid } },
      select: { birthdayDay: true, birthdayMonth: true }
    });
    return res.json({ success: true, birthdayDay: member?.birthdayDay ?? null, birthdayMonth: member?.birthdayMonth ?? null });
  }

  if (req.method === 'POST') {
    const { day, month, timezone } = req.body || {};
    if (
      (day !== 0 && (typeof day !== 'number' || day < 1 || day > 31)) ||
      (month !== 0 && (typeof month !== 'number' || month < 1 || month > 12))
    ) {
      return res.status(400).json({ success: false, error: 'Invalid day or month' });
    }
    const now = new Date();
    await prisma.workspaceMember.upsert({
      where: { workspaceGroupId_userId: { workspaceGroupId, userId: userid } },
      update: { 
        birthdayDay: day, 
        birthdayMonth: month,
        ...(timezone && { timezone }),
        joinDate: now
      },
      create: { 
        workspaceGroupId, 
        userId: userid, 
        birthdayDay: day, 
        birthdayMonth: month,
        timezone: timezone || 'UTC',
        joinDate: now
      },
    });
    return res.json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});
