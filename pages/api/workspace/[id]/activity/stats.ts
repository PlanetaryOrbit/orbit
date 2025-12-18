// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { withSessionRoute } from '@/lib/withSession'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import { getConfig } from '@/utils/configEngine'

type Data = {
	success: boolean
	message?: object;
	error?: string
}

export default withPermissionCheck(handler, 'view_entire_groups_activity');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });

	const workspaceId = parseInt(req.query.id as string);
	const activityConfig = await getConfig('activity', workspaceId);
	const idleTimeEnabled = activityConfig?.idleTimeEnabled ?? true;

	const sessions = await prisma.activitySession.findMany({
		where: {
			workspaceGroupId: workspaceId,
			active: false
		}
	});

	const messageArr: number[] = [];
	const idleArr: number[] = [];

	for (const session of sessions){
		messageArr.push(session.messages as number);
		if(idleTimeEnabled && session.idleTime) idleArr.push(Number(session.idleTime));
	}

	return res.status(200).json({
		success: true,
		message: {
			messages: messageArr.length ? messageArr.reduce((total, currentValue) => total + currentValue, 0) : 0,
			idle: idleArr.length ? idleArr.reduce((total, currentValue) => total + currentValue, 0) : 0,
			idleTimeEnabled
		}
	});
}
