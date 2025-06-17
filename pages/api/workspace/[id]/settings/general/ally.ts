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
	count?: number
	value?: any
}

export default withPermissionCheck(handler, 'admin');

export async function handler(
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
	if (req.method !== 'PATCH') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (typeof req.body.enabled !== "boolean") return res.status(400).json({ success: false, error: 'No enabled provided' })
	await setConfig('allies', {
		enabled: req.body.enabled
	}, parseInt(req.query.id as string));
	
	res.status(200).json({ success: true })
}
