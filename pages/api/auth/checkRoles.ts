import { NextApiRequest, NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth'
import { checkSpecificUser } from "@/utils/permissionsManager";

export default withAuth(handler);

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
  if (!req.auth.userId) return res.status(401).json({ success: false, error: 'Not logged in' })
  
  const data = await checkSpecificUser(req.auth.userId);
  
  const workspaceDataSet = new Set();
  for (const memberInfo of data) {
    workspaceDataSet.add(memberInfo.workspace);
  }
  
  const uniqueWorkspaces = Array.from(workspaceDataSet);
  
  res.status(200).json({ success: true, data: uniqueWorkspaces })
}