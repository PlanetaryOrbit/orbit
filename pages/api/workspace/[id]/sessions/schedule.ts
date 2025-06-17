import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing workspace id' });

  const sessions = await prisma.schedule.findMany({
    where: {
      sessionType: {
        workspaceGroupId: parseInt(id as string)
      }
    },
    include: {
      sessionType: {
        include: {
          hostingRoles: true
        }
      },
      sessions: {
        include: {
          owner: true,
          users: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  res.status(200).json({
    sessions: JSON.parse(JSON.stringify(sessions, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
  });
} 