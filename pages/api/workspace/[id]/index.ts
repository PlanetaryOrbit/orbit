// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig } from '@/utils/configEngine'
import prisma, { role } from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import {
	ALLIANCE_STRIKES_DEFAULT_MAX,
	normalizeAllianceMaxStrikes,
} from '@/utils/allianceStrikesConfig'
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';

type RoleOut = Omit<role, 'groupRoles'> & { groupRoles: string[] };

type Data = {
	success: boolean
	error?: string
	permissions?: string[]
	workspace?: {
		groupId: number
		groupThumbnail: string
		groupName: string,
		customName: string,
		roles: RoleOut[],
		yourRole: string | null,
		yourPermission: string[]
		groupTheme: string,
		groupDarkTheme: string,
    lastSynced: Date | null,
    lastSyncedSuccessful: boolean | null,
		settings: {
			guidesEnabled: boolean
			leaderboardEnabled: boolean
			sessionsEnabled: boolean
			alliesEnabled: boolean
			noticesEnabled: boolean
			resignationsEnabled: boolean
			policiesEnabled: boolean
			widgets: string[]
			allianceMaxStrikes: number
		}
	}
}

export default withAuth(handler);

export async function handler(
	req: AuthenticatedRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.auth.userId) return res.status(401).json({ success: false, error: 'Not authenticated' });
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
			userid: BigInt(req.auth.userId)
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
	if (!user.roles.length) return res.status(401).json({ success: false, error: 'Unauthorized' });

	const groupName = workspace.groupName || 'Unknown Group';
	const groupLogo = workspace.groupLogo || '';
	const [
		themeconfig,
		darkThemeConfig,
		guidesConfig,
		leaderboardConfig,
		sessionsConfig,
		alliesConfig,
		noticesConfig,
		resignationsConfig,
		policiesConfig,
		homeConfig,
		allianceStrikesConfig,
	] = await Promise.all([
		getConfig('theme', workspace.groupId),
		getConfig('darkTheme', workspace.groupId),
		getConfig('guides', workspace.groupId),
		getConfig('leaderboard', workspace.groupId),
		getConfig('sessions', workspace.groupId),
		getConfig('allies', workspace.groupId),
		getConfig('notices', workspace.groupId),
		getConfig('resignations', workspace.groupId),
		getConfig('policies', workspace.groupId),
		getConfig('home', workspace.groupId),
		getConfig('alliance_strikes', workspace.groupId),
	]);
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
		"Submit resignation": "submit_resignation",
		"Approve resignations": "approve_resignations",
		"Manage resignations": "manage_resignations",
		"Create quotas": "create_quotas",
		"Delete quotas": "delete_quotas",
		"View member profiles": "view_member_profiles",
		"Edit member details": "edit_member_details",
		"Record notices": "record_notices",
		"Activity adjustments": "activity_adjustments",
		"View logbook": "view_logbook",
		"Logbook redact": "logbook_redact",
		"Logbook delete": "logbook_delete",
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
		customName: workspace.customName ?? "",
		yourPermission: isAdmin ? Object.values(permissions) : user.roles[0].permissions,
		groupTheme: themeconfig,
		groupDarkTheme: darkThemeConfig,
		roles: workspace.roles.map((r) => ({
			...r,
			groupRoles: r.groupRoles.map((id) => id.toString()),
		})),
		yourRole: user.roles[0].id,
    lastSynced: workspace.lastSynced,
    lastSyncedSuccessful: workspace.lastSyncedSuccessful,
		settings: {
			guidesEnabled: guidesConfig?.enabled || false,
			leaderboardEnabled: leaderboardConfig?.enabled || false,
			sessionsEnabled: sessionsConfig?.enabled || false,
			alliesEnabled: alliesConfig?.enabled || false,
			noticesEnabled: noticesConfig?.enabled || false,
			resignationsEnabled: resignationsConfig?.enabled || false,
			policiesEnabled: policiesConfig?.enabled || false,
			widgets: homeConfig?.widgets || [],
			allianceMaxStrikes: normalizeAllianceMaxStrikes(
				allianceStrikesConfig?.maxStrikes ?? ALLIANCE_STRIKES_DEFAULT_MAX,
			),
		}
	} })
}
