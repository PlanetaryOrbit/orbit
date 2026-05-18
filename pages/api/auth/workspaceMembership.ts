
import { NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth'

export default withAuth(handler);

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const workspaceInfo = await prisma.workspaceMember.findMany({
    where: {
      userId: req.auth.userId
    },
    include: {
      workspace: true
    }
  });

  let data = new Set()
  for (const wInfo of workspaceInfo) {
    data.add(wInfo.workspace)
  }

  res.status(200).json({ success: true, data: Array.from(data) });
}