// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig } from '@/utils/configEngine'
import prisma from '@/utils/database';
import * as noblox from 'noblox.js'
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
type Data = {
	success: boolean
	error?: string
	roles?: any
	currentRole?: any
	leaderboardRole?: any
	idleTimeEnabled?: boolean
}

export default withAuth(handler);

export async function handler(
	req: AuthenticatedRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
	
	if (!req.auth.userId) {
		return res.status(401).json({ success: false, error: 'Unauthorized' });
	}
	const workspace = await prisma.workspace.findFirst({
		where: {
			groupId: parseInt(req.query.id as string),
		}
	});
	if (!workspace) return res.status(404).json({ success: false, error: 'Workspace not found' });

	const roles = await noblox.getRoles(workspace.groupId);
	const activityconfig = await getConfig('activity', parseInt(req.query.id as string));

	res.status(200).send({
		roles,
		currentRole: activityconfig?.role,
		leaderboardRole: activityconfig?.leaderboardRole,
		idleTimeEnabled: activityconfig?.idleTimeEnabled ?? true,
		success: true,
	});
}
