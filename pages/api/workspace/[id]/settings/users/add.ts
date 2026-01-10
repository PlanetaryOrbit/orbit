// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { user }from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { logAudit } from '@/utils/logs';
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import { getRobloxUsername, getRobloxThumbnail, getRobloxDisplayName, getRobloxUserId } from "@/utils/roblox";
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
	user?: any
}

export default withPermissionCheck(handler, 'admin');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
	const userid = await getRobloxUserId(req.body.username).catch(() => null) as bigint | null;
	if (!userid) return res.status(400).json({ success: false, error: 'Invalid username' });

	const role = await prisma.role.findFirst({
		where: {
			workspaceGroupId: parseInt(req.query.id as string),
		}
	});
	const u = await prisma.user.findFirst({
		where: {
			userid: userid,
			roles: {
				some: {
					workspaceGroupId: parseInt(req.query.id as string)
				}
			}
		},
	});
	if (u) return res.status(400).json({ success: false, error: 'User already exists' });
	if (!role) return res.status(404).json({ success: false, error: 'Role not found' });

	const user = await prisma.user.upsert({
		where: {
			userid: userid
		},
		update: {
			username: await getUsername(userid),
			roles: {
				connect: {
					id: role.id
				}
			}
		},
		create: {
			userid: userid,
			username: await getUsername(userid),

			roles: {
				connect: {
					id: role.id
				}
			}
		},
	});

	await prisma.roleMember.upsert({
		where: {
			roleId_userId: {
				roleId: role.id,
				userId: userid
			}
		},
		update: {
			manuallyAdded: true
		},
		create: {
			roleId: role.id,
			userId: userid,
			manuallyAdded: true
		}
	});
	
	await prisma.workspaceMember.upsert({
		where: {
			workspaceGroupId_userId: {
				workspaceGroupId: parseInt(req.query.id as string),
				userId: userid
			}
		},
		update: {},
		create: {
			workspaceGroupId: parseInt(req.query.id as string),
			userId: userid,
			joinDate: new Date(),
			isAdmin: false
		}
	});
	
	const newuser = {
		roles: [
			role
		],
		userid: Number(user.userid),
		username: req.body.username,
		displayName: await getDisplayName(userid),
		thumbnail: await getThumbnail(userid)
	}

	try { await logAudit(parseInt(req.query.id as string), (req as any).session?.userid || null, 'settings.users.add', `user:${Number(user.userid)}`, { userId: Number(user.userid), username: req.body.username, role: role.id }); } catch (e) {}

	res.status(200).json({ success: true, user: newuser })
}
