import type { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionCheck } from '@/utils/permissionsManager';
import prisma from '@/utils/database';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, departmentId } = req.query;
  const workspaceGroupId = parseInt(id as string);
  const { name, color } = req.body;

  if (!workspaceGroupId || !departmentId) {
    return res.status(400).json({ error: 'Invalid workspace or department ID' });
  }

  try {
    const department = await prisma.department.update({
      where: {
        id: departmentId as string,
        workspaceGroupId,
      },
      data: {
        name,
        color,
      },
    });

    res.status(200).json({ department });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
};

export default withPermissionCheck(handler, 'admin');