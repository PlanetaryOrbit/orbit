// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
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
	const user = await prisma.user.findUnique({
		where: {
			userid: parseInt(req.query.userid as string)
		},
		include: {
			roles: {
				where: {
					workspaceGroupId: parseInt(req.query.id as string)
				}
			},
			workspaceMemberships: {
				where: {
					workspaceGroupId: parseInt(req.query.id as string)
				}
			}
		}
	});
	if (!user?.roles.length) return res.status(404).json({ success: false, error: 'User not found' });
	
	const newrole = await prisma.role.findUnique({
		where: {
			id: req.body.role
		}
	});
	if (!newrole) return res.status(404).json({ success: false, error: 'Role not found' });
	if (user.roles.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
	await prisma.user.update({
		where: {
			userid: parseInt(req.query.userid as string)
		},
		data: {
			roles: {
				disconnect: {
					id: user.roles[0].id
				},
				connect: {
					id: req.body.role
				}
			}
		}
	});
	await prisma.roleMember.deleteMany({
		where: {
			userId: parseInt(req.query.userid as string),
			roleId: user.roles[0].id
		}
	});
	await prisma.roleMember.upsert({
		where: {
			roleId_userId: {
				roleId: req.body.role,
				userId: BigInt(req.query.userid as string)
			}
		},
		update: {
			manuallyAdded: true
		},
		create: {
			roleId: req.body.role,
			userId: BigInt(req.query.userid as string),
			manuallyAdded: true
		}
	});

	try {
		const afterUser = await prisma.user.findUnique({ where: { userid: parseInt(req.query.userid as string) }, include: { roles: { where: { workspaceGroupId: parseInt(req.query.id as string) } } } });
		await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'settings.users.update', `user:${req.query.userid}`, { before: { role: user.roles[0].id }, after: { role: req.body.role }, userId: parseInt(req.query.userid as string) });
	} catch (e) {}

	res.status(200).json({ success: true })
}
