import type { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionCheck } from '@/utils/permissionsManager';
import prisma from '@/utils/database';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, departmentId } = req.query;
  const workspaceGroupId = parseInt(id as string);

  if (!workspaceGroupId || !departmentId) {
    return res.status(400).json({ error: 'Invalid workspace or department ID' });
  }

  try {
    await prisma.departmentMember.deleteMany({
      where: {
        departmentId: departmentId as string,
        workspaceGroupId,
      },
    });

    // Then delete the department
    await prisma.department.delete({
      where: {
        id: departmentId as string,
        workspaceGroupId,
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
};

export default withPermissionCheck(handler, 'admin');