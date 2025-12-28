import type { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionCheck } from '@/utils/permissionsManager';
import prisma from '@/utils/database';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const workspaceGroupId = parseInt(id as string);

  if (!workspaceGroupId) {
    return res.status(400).json({ error: 'Invalid workspace ID' });
  }

  try {
    const department = await prisma.department.create({
      data: {
        name: 'New Department',
        color: '#6b7280',
        workspaceGroupId,
      },
    });

    res.status(200).json({ department });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};

export default withPermissionCheck(handler, 'admin');