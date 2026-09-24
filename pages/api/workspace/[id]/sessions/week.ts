import { NextApiRequest, NextApiResponse } from 'next';

import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager';

export default withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  try {
    const allSessions = await prisma.session.findMany({
      where: {
        sessionType: {
          workspaceGroupId: parseInt(id as string),
        },
      },
      select: {
        id: true,
        date: true,
        sessionType: {
          select: { name: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    allSessions.forEach((session) => {
      console.log(
        `- ${session.sessionType.name}: ${session.date.toISOString()} (${session.date.toString()})`,
      );
    });

    const sessions = await prisma.session.findMany({
      where: {
        sessionType: {
          workspaceGroupId: parseInt(id as string),
        },
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      include: {
        owner: true,
        sessionType: true,
        users: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const serializedSessions = JSON.parse(
      JSON.stringify(sessions, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
    res.status(200).json(serializedSessions);
  } catch (error) {
    console.error('Error fetching week sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});
