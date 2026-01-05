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
			roles: true
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
				}
			},
			workspaceMemberships: {
				where: {
					workspaceGroupId: workspace.groupId
				}
			}
		}
	});
	if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

	const groupName = workspace.groupName || 'Unknown Group';
	const groupLogo = workspace.groupLogo || '';
	const themeconfig = await getConfig('theme', workspace.groupId);

	const permissions = {
		"View wall": "view_wall",
		"Post on wall": "post_on_wall",
		"Delete wall posts": "delete_wall_posts",
		'Assign users to Sessions': 'sessions_assign',
		'Assign Self to Sessions': 'sessions_claim',
		'Host Sessions': 'sessions_host',
		"Create Unscheduled": "sessions_unscheduled",
		"Create Scheduled": "sessions_scheduled",
		"Manage sessions": "manage_sessions",
		"View members": "view_members",
		"Use saved views": "use_views",
		"Create views": "create_views",
		"Edit views": "edit_views",
		"Delete views": "delete_views",
		"Create docs": "create_docs",
		"Edit docs": "edit_docs",
		"Delete docs": "delete_docs",
		"Create policies": "create_policies",
		"Edit policies": "edit_policies",
		"Delete policies": "delete_policies",
		"View compliance": "view_compliance",
		"Create notices": "create_notices",
		"Approve notices": "approve_notices",
		"Manage notices": "manage_notices",
		"Create quotas": "create_quotas",
		"Delete quotas": "delete_quotas",
		"View member profiles": "view_member_profiles",
		"Edit member details": "edit_member_details",
		"Record notices": "record_notices",
		"Activity adjustments": "activity_adjustments",
		"View logbook": "view_logbook",
		"Logbook redact": "logbook_redact",
		"Logbook note": "logbook_note",
		"Logbook warning": "logbook_warning",
		"Logbook promotion": "logbook_promotion",
		"Logbook demotion": "logbook_demotion",
		"Logbook termination": "logbook_termination",
		"Rank users": "rank_users",
		"Create alliances": "create_alliances",
		"Delete alliances": "delete_alliances",
		"Represent alliance": "represent_alliance",
		"Edit alliance details": "edit_alliance_details",
		"Add alliance notes": "add_alliance_notes",
		"Edit alliance notes": "edit_alliance_notes",
		"Delete alliance notes": "delete_alliance_notes",
		"Add alliance visits": "add_alliance_visits",
		"Edit alliance visits": "edit_alliance_visits",
		"Delete alliance visits": "delete_alliance_visits",
		"Admin (Manage workspace)": "admin",
		"Reset activity": "reset_activity",
		"View audit logs": "view_audit_logs",
		"Create API keys": "manage_apikeys",
		"Manage features": "manage_features",
		"Workspace customisation": "workspace_customisation",
	};	
	
	const membership = user.workspaceMemberships[0];
	const isAdmin = membership?.isAdmin || false;
	
	res.status(200).json({ success: true, permissions: user.roles[0].permissions, workspace: {
		groupId: workspace.groupId,
		groupThumbnail: groupLogo,
		groupName: groupName,
		yourPermission: isAdmin ? Object.values(permissions) : user.roles[0].permissions,
		groupTheme: themeconfig,
		roles: workspace.roles,
		yourRole: user.roles[0].id,
		settings: {
			guidesEnabled: (await getConfig('guides', workspace.groupId))?.enabled || false,
			leaderboardEnabled: (await getConfig('leaderboard', workspace.groupId))?.enabled || false,
			sessionsEnabled: (await getConfig('sessions', workspace.groupId))?.enabled || false,
			alliesEnabled: (await getConfig('allies', workspace.groupId))?.enabled || false,
			noticesEnabled: (await getConfig('notices', workspace.groupId))?.enabled || false,
			policiesEnabled: (await getConfig('policies', workspace.groupId))?.enabled || false,
			widgets: (await getConfig('home', workspace.groupId))?.widgets || []
		}
	} })
}
