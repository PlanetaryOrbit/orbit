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
	widgets?: string[]
}

export default withPermissionCheck(handler, 'workspace_customisation');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'PATCH') return res.status(405).json({ success: false, error: 'Method not allowed' })
	try {
		const workspaceId = parseInt(req.query.id as string);
		const before = await getConfig('home', workspaceId);
		const after = { widgets: req.body.widgets };
		await setConfig('home', after, workspaceId);
		try { await logAudit(workspaceId, (req as any).session?.userid || null, 'settings.general.home.update', 'home', { before, after }); } catch (e) {}
		res.status(200).json({ success: true})
	} catch (error) {
		console.error('Failed to save home settings:', error);
		return res.status(500).json({ success: false, error: 'Server error' });
	}
}
