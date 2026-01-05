// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import { logAudit } from '@/utils/logs'
import prisma, {role} from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
import { get } from 'react-hook-form';
type Data = {
	success: boolean
	error?: string
	count?: number
	value?: any
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method === 'GET') {
		const config = await getConfig('allies', parseInt(req.query.id as string));
		if (!config) {
			return res.status(404).json({ success: false, error: 'Not found' });
		}
		return res.status(200).json({ success: true, value: config });
	}

	return withPermissionCheck(async (req: NextApiRequest, res: NextApiResponse<Data>) => {
		if (req.method !== 'PATCH') return res.status(405).json({ success: false, error: 'Method not allowed' })
		if (typeof req.body.enabled !== "boolean") return res.status(400).json({ success: false, error: 'No enabled provided' })
		const workspaceId = parseInt(req.query.id as string);
		const before = await getConfig('allies', workspaceId);
		const after = { enabled: req.body.enabled };
		await setConfig('allies', after, workspaceId);
		try { await logAudit(workspaceId, (req as any).session?.userid || null, 'settings.general.allies.update', 'allies', { before, after }); } catch (e) {}
		res.status(200).json({ success: true })
	}, 'manage_features')(req, res);
}
