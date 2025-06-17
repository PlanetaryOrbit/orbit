// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { SessionType, document } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'

import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
	log?: any
}

export default withPermissionCheck(handler, 'manage_docs');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
	const { type, notes } = req.body;
	if (!type || !notes) return res.status(400).json({ success: false, error: 'Missing required fields' });
	if (type !== 'termination' && type !== 'suspension' && type !== 'warning' && type !== 'promotion' && type !== 'demotion' && type !== 'note') return res.status(400).json({ success: false, error: 'Invalid type' });
	const { uid, id } = req.query; 
	if (!uid) return res.status(400).json({ success: false, error: 'Missing required fields' }); 

	const userbook = await prisma.userBook.create({
		data: {
			userId: BigInt(uid as string),
			type,
			workspaceGroupId: parseInt(id as string),
			reason: notes,
			adminId: BigInt(req.session.userid)
		},
		include: {
			admin: true,
		}
	});



	
	
	res.status(200).json({ success: true, log: JSON.parse(JSON.stringify(userbook, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) });
}
