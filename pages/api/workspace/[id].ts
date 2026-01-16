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
					}
				},
				workspaceMemberships: {
					where: {
						workspaceGroupId: workspace.groupId
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

	const sessionTypes = ["shift", "training", "event", "other"];
	const sessionPermissions: Record<string, string> = {};
	
	sessionTypes.forEach(type => {
		const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
		sessionPermissions[`See ${typeCapitalized} Sessions`] = `sessions_${type}_see`;
		sessionPermissions[`Assign users to ${typeCapitalized} Sessions`] = `sessions_${type}_assign`;
		sessionPermissions[`Assign Self to ${typeCapitalized} Sessions`] = `sessions_${type}_claim`;
		sessionPermissions[`Host ${typeCapitalized} Sessions`] = `sessions_${type}_host`;
		sessionPermissions[`Create Unscheduled ${typeCapitalized} Sessions`] = `sessions_${type}_unscheduled`;
		sessionPermissions[`Create Scheduled ${typeCapitalized} Sessions`] = `sessions_${type}_scheduled`;
		sessionPermissions[`Manage ${typeCapitalized} Sessions`] = `sessions_${type}_manage`;
	});

	const permissions = {
		"View wall": "view_wall",
		"Post on wall": "post_on_wall",
		"Delete wall posts": "delete_wall_posts",
		"Add photos to wall posts": "add_wall_photos",
		...sessionPermissions,
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
		groupName: groupinfo.name,
		yourPermission: isAdmin ? Object.values(permissions) : user.roles[0].permissions,
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
