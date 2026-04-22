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
	const { color, darkColor } = req.body as { color?: string; darkColor?: string };

	if (!workspaceId || (!color && !darkColor)) {
		return res.status(400).json({ success: false, error: 'Missing workspace ID or color' });
	}

	try {
		if (color) {
			const before = await getConfig('theme', workspaceId);
			await setConfig('theme', color, workspaceId);
			try {
				await logAudit(workspaceId, (req as any).session?.userid || null, 'settings.general.color.update', 'theme', { before, after: color });
			} catch (e) {}
		}
		if (darkColor !== undefined) {
			const beforeDark = await getConfig('darkTheme', workspaceId);
			await setConfig('darkTheme', darkColor, workspaceId);
			try {
				await logAudit(workspaceId, (req as any).session?.userid || null, 'settings.general.color.update', 'darkTheme', { before: beforeDark, after: darkColor });
			} catch (e) {}
		}
		return res.status(200).json({ success: true });
	} catch (error) {
		return res.status(500).json({ success: false, error: 'Server error' });
	}
}
