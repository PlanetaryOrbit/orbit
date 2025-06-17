// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma from '@/utils/database';

import { withSessionRoute } from '@/lib/withSession'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import { getRegistry } from '@/utils/registryManager';
import * as noblox from 'noblox.js'

type User = {
	userId: number
	username: string
	canMakeWorkspace: boolean
	displayname: string
	thumbnail: string
}

type Data = {
	success: boolean
	error?: string
	user?: User
	workspaces?: { 
		groupId: number
		groupthumbnail: string
		groupname: string
	}[]
}

export default withSessionRoute(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	const { groupId } = req.body
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	const dbuser = await prisma.user.findUnique({
		where: {
			userid: req.session.userid
		}
	});

	if (!dbuser) return res.status(401).json({ success: false, error: 'Not logged in' });
	
	
	if (!groupId) return res.status(400).json({ success: false, error: 'Missing groupId' })

	if (typeof groupId !== 'number') return res.status(400).json({ success: false, error: 'Invalid groupId' })

	const tryandfind = await prisma.workspace.findUnique({
		where: {
			groupId: groupId
		}
	})
	if (tryandfind) return res.status(400).json({ success: false, error: 'Workspace already exists' })
	const urrole = await noblox.getRankInGroup(groupId, req.session.userid).catch(() => null)
	if (!urrole) return res.status(400).json({ success: false, error: 'You are not a high enough rank' })
	if (urrole < 10) return res.status(400).json({ success: false, error: 'You are not a high enough rank' })

	await prisma.workspace.create({
		data: {
			groupId: parseInt(req.body.groupId),
		}
	});

	await prisma.config.create({
		data: {
			key: "customization",
			workspaceGroupId: parseInt(req.body.groupId),
			value: {
				color: req.body.color
			}
		}
	});
	
	const role = await prisma.role.create({
		data: {
			workspaceGroupId: parseInt(req.body.groupId),
			name: "Admin",
			isOwnerRole: true,
			members: {
				connect: {
					userid: req.session.userid
				}
			},
			permissions: [
				'admin',
				'view_staff_config'
			]
		}
	});
	res.status(200).json({ success: true })


}
