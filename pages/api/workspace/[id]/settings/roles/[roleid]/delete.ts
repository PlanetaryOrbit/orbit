// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { logAudit } from '@/utils/logs';
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
import roles from '..';
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
	if (!req.query.roleid) return res.status(400).json({ success: false, error: 'Role ID not provided' });
	const role = await prisma.role.findMany({
		where: {
			workspaceGroupId: parseInt(req.query.id as string)
		},
		include: {
			members: true
		}
	});
	const oldrole = role.find(r => r.id === req.query.roleid);
	if (!oldrole) return res.status(404).json({ success: false, error: 'Role not found' });
	if (!(role.length - 1)) return res.status(404).json({ success: false, error: 'You cant delete a role with no fallback ' });
	
	const adminMembers = await prisma.workspaceMember.findMany({
		where: {
			workspaceGroupId: parseInt(req.query.id as string),
			isAdmin: true,
			user: {
				roles: {
					some: {
						id: req.query.roleid as string
					}
				}
			}
		}
	});
	
	if (adminMembers.length > 0) {
		return res.status(403).json({ success: false, error: 'Cannot delete a role assigned to an admin user' });
	}
	
	const newrole = role.find(r => r.id !== req.query.roleid);
	if (!newrole) {
		return res.status(400).json({ success: false, error: 'No fallback role available' });
	}

	for (const member of oldrole.members) {
		await prisma.user.update({
			where: {
				userid: member.userid
			},
			data: {
				roles: {
					connect: {
						id: newrole.id
					},
					disconnect: {
						id: oldrole.id
					}
				}
			}
		});
	};

	await prisma.role.delete({
		where: {
			id: (req.query.roleid as string)
		}
	});

	try {
		await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'settings.roles.delete', `role:${oldrole.name}`, { id: req.query.roleid, name: oldrole.name });
	} catch (e) {}

	res.status(200).json({ success: true })
}
