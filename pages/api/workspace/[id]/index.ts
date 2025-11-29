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
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not authenticated' });
	if (!req.query.id) return res.status(400).json({ success: false, error: 'Missing required fields' });

	const workspace = await prisma.workspace.findUnique({
		where: {
			groupId: parseInt(req.query.id as string)
		},
		include: {
			roles: {
				orderBy: {
					isOwnerRole: 'desc'
				}
			}
		}
	});
	if (!workspace) return res.status(404).json({ success: false, error: 'Not found' });

	const user = await prisma.user.findFirst({
		where: {
			userid: BigInt(req.session.userid)
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
	});
	if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

	const groupinfo = await noblox.getGroup(workspace.groupId);
	const themeconfig = await getConfig('theme', workspace.groupId);

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
		"Manage members": "manage_members",
		"Manage docs": "manage_docs",
		"Manage alliances": "manage_alliances",
		"Admin (Manage workspace)": "admin",
	};	res.status(200).json({ success: true, permissions: user.roles[0].permissions, workspace: {
		groupId: workspace.groupId,
		groupThumbnail: await noblox.getLogo(workspace.groupId),
		groupName: groupinfo.name,
		yourPermission: user.roles[0].isOwnerRole ? Object.values(permissions) : user.roles[0].permissions,
		groupTheme: themeconfig,
		roles: workspace.roles,
		yourRole: user.roles[0].id,
		settings: {
			guidesEnabled: (await getConfig('guides', workspace.groupId))?.enabled || false,
			leaderboardEnabled: (await getConfig('leaderboard', workspace.groupId))?.enabled || false,
			sessionsEnabled: (await getConfig('sessions', workspace.groupId))?.enabled || false,
			alliesEnabled: (await getConfig('allies', workspace.groupId))?.enabled || false,
			noticesEnabled: false,
			policiesEnabled: (await getConfig('policies', workspace.groupId))?.enabled || false,
			widgets: (await getConfig('home', workspace.groupId))?.widgets || []
		}
	} })
}
