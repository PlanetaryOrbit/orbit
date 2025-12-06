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
		groupThumbnail: string
		groupName: string
	}[]
	workspaceGroupId?: number
}

export default withSessionRoute(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	// Accept groupId as number or numeric string; optional color (currently unused beyond default)
	let { groupId, color } = req.body || {}
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	const dbuser = await prisma.user.findUnique({
		where: {
			userid: req.session.userid
		}
	});

	if (!dbuser) return res.status(401).json({ success: false, error: 'Not logged in' });
	// Validate and normalize groupId
	if (groupId === undefined || groupId === null) return res.status(400).json({ success: false, error: 'Missing groupId' })
	if (typeof groupId === 'string') {
		if (!/^\d+$/.test(groupId)) return res.status(400).json({ success: false, error: 'Invalid groupId' })
		groupId = parseInt(groupId, 10)
	}
	if (typeof groupId !== 'number' || isNaN(groupId)) return res.status(400).json({ success: false, error: 'Invalid groupId' })

	const tryandfind = await prisma.workspace.findUnique({
		where: {
			groupId: groupId
		}
	})
	if (tryandfind) return res.status(409).json({ success: false, error: 'Workspace already exists' })

	// Enforce one workspace per owner
	//const alreadyOwns = await prisma.workspace.findFirst({ where: { ownerId: BigInt(req.session.userid) } })
	//if (alreadyOwns) return res.status(403).json({ success: false, error: 'You already own a workspace' })
	const urrole = await noblox.getRankInGroup(groupId, req.session.userid).catch(() => null)
	if (!urrole) return res.status(400).json({ success: false, error: 'You are not a high enough rank' })
	if (urrole < 10) return res.status(400).json({ success: false, error: 'You are not a high enough rank' })

	await prisma.user.upsert({
		where: { userid: req.session.userid },
		update: {},
		create: { userid: req.session.userid }
	})

	// Default color fallback (kept for backward compatibility)
	color = 'bg-orbit'
	let groupName = `Group ${groupId}`;
	let groupLogo = '';
	
	try {
		const [logo, group] = await Promise.all([
			noblox.getLogo(groupId).catch(() => ''),
			noblox.getGroup(groupId).catch(() => null)
		]);
		if (group) groupName = group.name;
		if (logo) groupLogo = logo;
	} catch (err) {
		console.error('Failed to fetch group info during workspace creation:', err);
	}

	  const workspace = await prisma.$transaction(async (tx) => {
		const ws = await tx.workspace.create({
			data: {
		  groupId,
		  groupName,
		  groupLogo,
		  lastSynced: new Date()
		  //ownerId: BigInt(req.session.userid)
			}
		})

		await tx.config.create({
			data: {
				key: 'customization',
				workspaceGroupId: groupId,
				value: { color }
			}
		})

		await tx.config.createMany({
			data: [
				{
					key: 'guides',
					workspaceGroupId: groupId,
					value: { enabled: false }
				},
				{
					key: 'allies',
					workspaceGroupId: groupId,
					value: { enabled: false }
				},
				{
					key: 'sessions',
					workspaceGroupId: groupId,
					value: { enabled: false }
				},
				{
					key: 'notices',
					workspaceGroupId: groupId,
					value: { enabled: false }
				},
				{
					key: 'policies',
					workspaceGroupId: groupId,
					value: { enabled: false }
				},
				{
					key: 'leaderboard',
					workspaceGroupId: groupId,
					value: { enabled: false }
				}
			]
		})

		const role = await tx.role.create({
			data: {
				workspaceGroupId: groupId,
				name: 'Admin',
				isOwnerRole: true,
				permissions: [
					'admin',
					'view_staff_config',
					'manage_sessions',
					'sessions_unscheduled',
					'sessions_scheduled',
					'sessions_assign',
					'sessions_claim',
					'sessions_host',
					'manage_activity',
					'post_on_wall',
					'manage_wall',
					'manage_views',
					'view_wall',
					'view_members',
					'manage_members',
					'manage_quotas',
					'manage_docs',
					'manage_policies',
					'view_entire_groups_activity',
					'manage_alliances',
					'represent_alliance'
				],
				members: { connect: { userid: BigInt(req.session.userid) } }
			}
		})

		await tx.user.update({
			where: { userid: req.session.userid },
			data: { isOwner: true }
		})

		return ws
	})

	// Run initial role sync synchronously to populate cache before returning
	try {
		const { checkGroupRoles } = await import('@/utils/permissionsManager');
		await checkGroupRoles(groupId);
		console.log(`[createws] Completed initial sync for workspace ${groupId}`);
	} catch (err) {
		console.error(`[createws] Failed to complete initial sync:`, err);
	}

	return res.status(200).json({ success: true, workspaceGroupId: workspace.groupId })
}
