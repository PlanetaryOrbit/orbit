// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { logAudit } from '@/utils/logs';
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
}

export default withPermissionCheck(handler, 'admin');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
	const role = await prisma.role.findUnique({
		where: {
			id: (req.query.roleid as string)
		}
	});
	if (!role) return res.status(404).json({ success: false, error: 'Role not found' });
	if (role.isOwnerRole) return res.status(403).json({ success: false, error: 'Owner role cannot be modified' });
	await prisma.role.update({
		where: {
			id: (req.query.roleid as string)
		},
		data: {
			name: req.body.name || 'Untitled Role',
			permissions: req.body.permissions || [],
			groupRoles: req.body.groupRoles || [],
			color: req.body.color || null
		}
	});

	try {
		const after = await prisma.role.findUnique({ where: { id: (req.query.roleid as string) } });
		await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'settings.roles.update', `role:${req.query.roleid}`, { before: role, after });
	} catch (e) {}

	res.status(200).json({ success: true })
}
