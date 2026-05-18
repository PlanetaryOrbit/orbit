// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { role } from '@/utils/database';
// import { withAuth } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { logAudit } from '@/utils/logs';
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
	role?: role
}

export default withPermissionCheck(handler, 'admin');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	const role = await prisma.role.create({
		data: {
			name: 'New role',
			workspaceGroupId: parseInt(req.query.id as string),
		}
	});
	try {
		await logAudit(parseInt(req.query.id as string), (req as any).auth?.userId || null, 'settings.roles.create', `role:${role.id}`, { id: role.id, name: role.name });
	} catch (e) {}

	res.status(200).json({ success: true, role })
}
