// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig, setConfig } from '@/utils/configEngine'
import { logAudit } from '@/utils/logs'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
	success: boolean
	error?: string
}

export default withPermissionCheck(handler, 'admin');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	const workspace = await prisma.workspace.findFirst({
		where: {
			groupId: parseInt(req.query.id as string),
		}
	});
	if (!workspace) return res.status(404).json({ success: false, error: 'Workspace not found' });

	const activityconfig = await getConfig('activity', parseInt(req.query.id as string));
	const newconfig = {
		...activityconfig,
		idleTimeEnabled: req.body.enabled
	};
	await setConfig('activity', newconfig, parseInt(req.query.id as string));

	try { await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'settings.activity.idleTime.update', 'activity.idleTime', { before: activityconfig, after: newconfig }); } catch (e) {}

	res.status(200).send({
		success: true,
	});
}
