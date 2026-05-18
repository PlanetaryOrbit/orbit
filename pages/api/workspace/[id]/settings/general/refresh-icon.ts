import type { NextApiRequest, NextApiResponse } from 'next';
import * as noblox from 'noblox.js';
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager';
import { logAudit } from '@/utils/logs';

type Data = {
	success: boolean;
	error?: string;
	groupThumbnail?: string;
};

export default withPermissionCheck(handler, 'workspace_customisation');

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
	if (req.method !== 'POST') {
		return res.status(405).json({ success: false, error: 'Method not allowed' });
	}
	const workspaceId = parseInt(req.query.id as string, 10);
	if (Number.isNaN(workspaceId)) {
		return res.status(400).json({ success: false, error: 'Invalid workspace ID' });
	}

	let logo: string;
	try {
		logo = await noblox.getLogo(workspaceId, '420x420');
	} catch (e) {
		console.error('[refresh-icon] noblox.getLogo failed:', e);
		return res.status(502).json({
			success: false,
			error: 'Could not fetch the group icon from Roblox. Try again in a moment.',
		});
	}
	if (!logo) {
		return res.status(502).json({
			success: false,
			error: 'Roblox did not return an icon for this group.',
		});
	}

	try {
		const before = await prisma.workspace.findUnique({
			where: { groupId: workspaceId },
			select: { groupLogo: true },
		});

		await prisma.workspace.update({
			where: { groupId: workspaceId },
			data: { groupLogo: logo },
		});

		try {
			await logAudit(
				workspaceId,
				(req as NextApiRequest & { session?: { userid?: number } }).session?.userid ?? null,
				'settings.general.refresh_group_logo',
				'workspace',
				{ before: before?.groupLogo ?? null, after: logo }
			);
		} catch {}

		return res.status(200).json({ success: true, groupThumbnail: logo });
	} catch (e) {
		console.error('[refresh-icon] database update failed:', e);
		return res.status(500).json({ success: false, error: 'Failed to save workspace icon' });
	}
}
