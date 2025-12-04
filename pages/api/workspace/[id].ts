// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { role } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'

type Data = {
	success: boolean
	error?: string
	permissions?: string[]
	workspace?: {
		groupId: number
		groupThumbnail: string
		groupName: string,
		roles: role[],
		yourRole: string | null,
		yourPermission: string[]
		groupTheme: string,
		settings: {
			guidesEnabled: boolean
			leaderboardEnabled: boolean
			sessionsEnabled: boolean
			alliesEnabled: boolean
			noticesEnabled: boolean
			policiesEnabled: boolean
			widgets: string[]
		}
	}
}

export default withPermissionCheck(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	const { id } = req.query
	const time = new Date()
	
	if (!id) return res.status(400).json({ success: false, error: 'No id provided' })
	if (isNaN(Number(id))) return res.status(400).json({ success: false, error: 'Invalid id provided' })
	
	const [workspaceCount, workspace] = await Promise.all([
		prisma.workspace.count(),
		prisma.workspace.findUnique({
			where: {
				groupId: parseInt((id as string))
			}
		})
	]);
	
	if (!workspaceCount) return res.status(400).json({ success: false, error: 'Workspace not setup' })
	if (!workspace) return res.status(400).json({ success: false, error: 'Workspace not found' })
	console.log(`Workspace found after ${new Date().getTime() - time.getTime()}ms`)
	
	const [
		themeconfig,
		roles,
		groupinfo,
		groupLogo,
		user,
		guidesConfig,
		leaderboardConfig,
		sessionsConfig,
		alliesConfig,
		noticesConfig,
		policiesConfig,
		homeConfig
	] = await Promise.all([
		getConfig('customization', workspace.groupId),
		prisma.role.findMany({
			where: {
				workspaceGroupId: workspace.groupId
			},
			orderBy: {
				isOwnerRole: 'desc'
			}
		}),
		noblox.getGroup(workspace.groupId),
		noblox.getLogo(workspace.groupId),
		prisma.user.findUnique({
			where: {
				userid: req.session.userid
			},
			include: {
				roles: {
					where: {
						workspaceGroupId: workspace.groupId
					},
					orderBy: {
						isOwnerRole: 'desc'
					}
				}
			}
		}),
		getConfig('guides', workspace.groupId),
		getConfig('leaderboard', workspace.groupId),
		getConfig('sessions', workspace.groupId),
		getConfig('allies', workspace.groupId),
		getConfig('notices', workspace.groupId),
		getConfig('policies', workspace.groupId),
		getConfig('home', workspace.groupId)
	]);
	
	console.log(`All data fetched after ${new Date().getTime() - time.getTime()}ms`)

	if (!user) return res.status(401).json({ success: false, error: 'Not logged in' })
	if (!user.roles.length) return res.status(401).json({ success: false, error: 'Not logged in' })

	const permissions = {
		"View wall": "view_wall",
		"View members": "view_members",
		"View Activity History": "view_entire_groups_activity",
		"Post on wall": "post_on_wall",
		"Represent alliance": "represent_alliance",
		'Assign users to Sessions': 'sessions_assign',
		'Assign Self to Sessions': 'sessions_claim',
		'Host Sessions': 'sessions_host',
		"Manage sessions": "manage_sessions",
		"Manage activity": "manage_activity",
		"Manage quotas": "manage_quotas",
		"Manage members": "manage_members",
		"Manage docs": "manage_docs",
		"Manage alliances": "manage_alliances",
		"Manage policies": "manage_policies",
		"Admin (Manage workspace)": "admin",
	};	
	
	res.status(200).json({ success: true, permissions: user.roles[0].permissions, workspace: {
		groupId: workspace.groupId,
		groupThumbnail: groupLogo,
		groupName: groupinfo.name,
		yourPermission: user.roles[0].isOwnerRole ? Object.values(permissions) : user.roles[0].permissions,
		groupTheme: themeconfig,
		roles: roles,
		yourRole: user.roles[0].id,
		settings: {
			guidesEnabled: guidesConfig?.enabled || false,
			leaderboardEnabled: leaderboardConfig?.enabled || false,
			sessionsEnabled: sessionsConfig?.enabled || false,
			alliesEnabled: alliesConfig?.enabled || false,
			noticesEnabled: noticesConfig?.enabled || false,
			policiesEnabled: policiesConfig?.enabled || false,
			widgets: homeConfig?.widgets || []
		}
	} })
}
