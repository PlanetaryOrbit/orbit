// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
import { logAudit } from '@/utils/logs';
type Data = {
	success: boolean
	error?: string
}

export default withPermissionCheck(handler, 'admin');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' });
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
	const membership = user.workspaceMemberships[0];
	if (membership?.isAdmin) {
		return res.status(403).json({ success: false, error: 'You cannot remove an admin from the workspace' });
	}
	
	await prisma.user.update({
		where: {
			userid: parseInt(req.query.userid as string)
		},
		data: {
			roles: {
				disconnect: {
					id: user.roles[0].id
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

	res.status(200).json({ success: true })
}
