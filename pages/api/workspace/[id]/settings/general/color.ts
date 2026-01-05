import type { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionCheck } from '@/utils/permissionsManager';
import { setConfig, getConfig } from '@/utils/configEngine';
import { logAudit } from '@/utils/logs';

type Data = {
	success: boolean;
	error?: string;
};

export default withPermissionCheck(handler, 'workspace_customisation');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'PATCH') {
		return res.status(405).json({ success: false, error: 'Method not allowed' });
	}

	const workspaceId = parseInt(req.query.id as string);
	const color = req.body.color;

	if (!workspaceId || !color) {
		return res.status(400).json({ success: false, error: 'Missing workspace ID or color' });
	}

	try {
		try {
			const before = await getConfig('theme', workspaceId);
			await setConfig('theme', color, workspaceId);
			try {
				await logAudit(workspaceId, (req as any).session?.userid || null, 'settings.general.color.update', 'theme', { before, after: color });
			} catch (e) {}
			return res.status(200).json({ success: true });
		} catch (error) {
			console.error('Failed to save theme color:', error);
			return res.status(500).json({ success: false, error: 'Server error' });
		}
	} catch (error) {
		console.error('Failed to save theme color:', error);
		return res.status(500).json({ success: false, error: 'Server error' });
	}
}
