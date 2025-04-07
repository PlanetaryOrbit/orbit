// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, {role} from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
import { get } from 'react-hook-form';
type Data = {
	success: boolean
	error?: string
	color?: string
}

export default withPermissionCheck(handler, 'admin');

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
		await setConfig('theme', color, workspaceId);

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error('Failed to save theme color:', error);
		return res.status(500).json({ success: false, error: 'Server error' });
	}
}
