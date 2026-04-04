import { getConfig } from './configEngine';
import fs from 'node:fs'
import path from 'node:path';
import prisma from './database';
import { Field } from 'react-hook-form';

export type AuditDetails = Record<string, any>;

const PERMISSION_LABELS: Record<string, string> = {
	'view_wall': 'View wall',
	'post_on_wall': 'Post on wall',
	'delete_wall_posts': 'Delete wall posts',
	'sessions_shift_see': 'Shift Sessions - See',
	'sessions_shift_assign': 'Shift Sessions - Assign',
	'sessions_shift_claim': 'Shift Sessions - Claim',
	'sessions_shift_host': 'Shift Sessions - Host',
	'sessions_shift_unscheduled': 'Shift Sessions - Create Unscheduled',
	'sessions_shift_scheduled': 'Shift Sessions - Create Scheduled',
	'sessions_shift_manage': 'Shift Sessions - Manage',
	'sessions_shift_notes': 'Shift Sessions - Add Notes',
	'sessions_training_see': 'Training Sessions - See',
	'sessions_training_assign': 'Training Sessions - Assign',
	'sessions_training_claim': 'Training Sessions - Claim',
	'sessions_training_host': 'Training Sessions - Host',
	'sessions_training_unscheduled': 'Training Sessions - Create Unscheduled',
	'sessions_training_scheduled': 'Training Sessions - Create Scheduled',
	'sessions_training_manage': 'Training Sessions - Manage',
	'sessions_training_notes': 'Training Sessions - Add Notes',
	'sessions_event_see': 'Event Sessions - See',
	'sessions_event_assign': 'Event Sessions - Assign',
	'sessions_event_claim': 'Event Sessions - Claim',
	'sessions_event_host': 'Event Sessions - Host',
	'sessions_event_unscheduled': 'Event Sessions - Create Unscheduled',
	'sessions_event_scheduled': 'Event Sessions - Create Scheduled',
	'sessions_event_manage': 'Event Sessions - Manage',
	'sessions_event_notes': 'Event Sessions - Add Notes',
	'sessions_other_see': 'Other Sessions - See',
	'sessions_other_assign': 'Other Sessions - Assign',
	'sessions_other_claim': 'Other Sessions - Claim',
	'sessions_other_host': 'Other Sessions - Host',
	'sessions_other_unscheduled': 'Other Sessions - Create Unscheduled',
	'sessions_other_scheduled': 'Other Sessions - Create Scheduled',
	'sessions_other_manage': 'Other Sessions - Manage',
	'sessions_other_notes': 'Other Sessions - Add Notes',
	'view_members': 'View members',
	'use_views': 'Use saved views',
	'create_views': 'Create views',
	'edit_views': 'Edit views',
	'delete_views': 'Delete views',
	'create_docs': 'Create docs',
	'edit_docs': 'Edit docs',
	'delete_docs': 'Delete docs',
	'create_policies': 'Create policies',
	'edit_policies': 'Edit policies',
	'delete_policies': 'Delete policies',
	'view_compliance': 'View compliance',
	'create_notices': 'Create notices',
	'approve_notices': 'Approve notices',
	'manage_notices': 'Manage notices',
	'create_quotas': 'Create quotas',
	'delete_quotas': 'Delete quotas',
	'view_member_profiles': 'Profiles - View',
	'edit_member_details': 'Info - Edit details',
	'record_notices': 'Notices - Record approved',
	'activity_adjustments': 'Activity - Adjustments',
	'activity.adjustments': 'Activity - Adjustments',
	'view_logbook': 'Logbook - See Entries',
	'logbook_redact': 'Logbook - Redact Entries',
	'logbook_note': 'Logbook - Note',
	'logbook_warning': 'Logbook - Warning',
	'logbook_promotion': 'Logbook - Promotion',
	'logbook_demotion': 'Logbook - Demotion',
	'logbook_termination': 'Logbook - Termination',
	'rank_users': 'Logbook - Use Ranking Integration',
	'create_alliances': 'Create alliances',
	'delete_alliances': 'Delete alliances',
	'represent_alliance': 'Represent alliance',
	'edit_alliance_details': 'Edit alliance details',
	'add_alliance_notes': 'Add notes',
	'edit_alliance_notes': 'Edit notes',
	'delete_alliance_notes': 'Delete notes',
	'add_alliance_visits': 'Add visits',
	'edit_alliance_visits': 'Edit visits',
	'delete_alliance_visits': 'Delete visits',
	'admin': 'Admin (Manage workspace)',
	'reset_activity': 'Reset activity',
	'view_audit_logs': 'View audit logs',
	'manage_apikeys': 'Create API keys',
	'manage_features': 'Manage features',
	'workspace_customisation': 'Workspace customisation',
	'document.create': 'Document Create',
	'document.update': 'Document Update',
	'document.delete': 'Document Delete',
	'session.create': 'Session Create',
	'session.delete': 'Session Delete',
	'wall.post.delete': 'Wall Delete',
	'wall.post.create': 'Wall Create',
	'recurring': 'Recurring',
	'shift': 'Shift',
	'training': 'Training',
	'event': 'Event',
	'other': 'Other'
};

type WebhookRes = {
	enabled: boolean,
	url: string
}

type FieldObject = {
	name: string,
	value: string,
	inline: boolean,
}

type EmbedObject = {
	title: string,
	description?: string,
	color: number,
	thumbnail?: {
		url: string
	},
	fields: FieldObject[],
	timestamp: string,
}

const rootFolder = process.cwd()

const publicFolder = path.join(rootFolder, "public")
const avatarFolder = path.join(publicFolder, "avatars")

async function getRole(roleid: string) {
	const roleInfo = await prisma.role.findUnique({
		where: {
			id: roleid
		}
	});

	if (!roleInfo) return null;
	return roleInfo
}

async function getDepartment(did: string) {
	const departmentInfo = await prisma.department.findUnique({
		where: {
			id: did
		}
	});

	if (!departmentInfo) return null;
	return departmentInfo
}

function getColor(action: string) {
	action = action.toLowerCase();

	switch (true) {
		case action.includes("create") || action.includes("add"):
			return 3534206;

		case action.includes("update") || action.includes("edit"):
			return 4356341;

		case action.includes("delete"):
			return 16751515;

		default:
			return 16711833;
	}
}

function getAction(action: string) {
	action = action.toLowerCase();

	switch (true) {
		case action.includes("create"):
			return "Create";

		case action.includes("update") || action.includes("edit"):
			return "Edit";

		case action.includes("delete"):
			return "Delete";

		default:
			return "Audit Log";
	}
}

export async function logAudit(workspaceGroupId: number, userId: number | null, action: string, entity?: string, details?: AuditDetails) {
	try {
		const p: any = prisma as any;
		if (p && p.auditLog) {
			await p.auditLog.create({
				data: {
					workspaceGroupId,
					userId: userId ? BigInt(userId) : undefined,
					action,
					entity: entity || null,
					details: details || null,
				},
			});

			const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

			await p.auditLog.deleteMany({
				where: {
					workspaceGroupId,
					createdAt: { lt: cutoff },
				},
			});

		} else {
			const detailsJson = details ? JSON.stringify(details) : null;

			await prisma.$executeRaw`
    			INSERT INTO "AuditLog" ("workspaceGroupId","userId","action","entity","details","createdAt")
    			VALUES (${workspaceGroupId}, ${userId ? BigInt(userId) : null}, ${action}, ${entity || null}, ${detailsJson}::jsonb, NOW())`;

			const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

			await prisma.$executeRaw`
    			DELETE FROM "AuditLog"
    			WHERE "workspaceGroupId" = ${workspaceGroupId}
    			AND "createdAt" < ${cutoff}`;
		}

		const webhook: WebhookRes = await getConfig("discord_webhook", workspaceGroupId) as any;

		let userInfo;

		if (userId) {
			const user = await prisma.user.findUnique({
				where: {
					userid: userId
				}
			})
			if (user) {
				userInfo = user
			}
		}

		if (webhook.enabled && webhook.url.length > 1) {
			if (webhook.enabled && webhook.url) {
				try {
					const userAction = getAction(action)

					const avatarUrl =
						userId && process.env.NEXTAUTH_URL
							? `${process.env.NEXTAUTH_URL}/avatars/${userId}_180.png`
							: "https://cdn.planetaryapp.us/brand/planetary.png"

					let jsonDetails: AuditDetails | null = null;

					if (details) {
						try {
							jsonDetails = typeof details === "string" ? JSON.parse(details) : details;
						} catch (e) {
							console.error("Failed to parse audit details:", e);
						}
					}

					const embed: EmbedObject = {
						title: userAction,
						description: userInfo
							? `**${userInfo.username}** performed **${userAction.toLowerCase() == "audit log"
								? "a workspace change"
								: userAction.toLowerCase()}**`
							: "Automated system action",
						color: getColor(action),
						thumbnail: {
							url: avatarUrl,
						},
						fields: [
							{
								name: "Action",
								value: PERMISSION_LABELS[action] || `\`${action}\``,
								inline: true,
							},
							{
								name: "Entity",
								value: entity ? `\`${entity}\`` : "None",
								inline: true,
							},
							{
								name: "User",
								value: userId ? `\`${userId}\`` : "Automation",
								inline: true,
							},
							{
								name: "Workspace",
								value: `\`${workspaceGroupId}\``,
								inline: true,
							},
						],
						timestamp: new Date().toISOString(),
					}

					const webhookBody = {
						username: "Orbit",
						avatar_url: "https://cdn.planetaryapp.us/brand/planetary.png",
						embeds: [embed],
					}

					if (jsonDetails && typeof jsonDetails == "object") {
						const detailFields: FieldObject[] = await Promise.all(
							Object.entries(jsonDetails).map(async ([key, value]) => {
								let displayValue: string = "N/A";

								if (key === "roles" && Array.isArray(value)) {
									const roles = await Promise.all(value.map(id => getRole(id)));
									displayValue = roles.filter(Boolean).map(r => r!.name).join(", ") || "None";
								} else if (typeof value === "object" && value !== null) {
									displayValue = JSON.stringify(value, null, 2);
								} else if (value !== undefined && value !== null) {
									displayValue = String(value);
								}

								if (!displayValue) displayValue = "N/A";

								if (displayValue.length > 1024) displayValue = displayValue.slice(0, 1021) + "...";

								return {
									name: key
										.replace(/([A-Z])/g, " $1")
										.replace(/^./, str => str.toUpperCase()),
									value: displayValue,
									inline: true,
								};
							})
						);

						webhookBody.embeds.push({
							title: "Details",
							color: getColor(action),
							timestamp: new Date().toISOString(),
							fields: detailFields,
						});
					}

					const res = await fetch(webhook.url, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(webhookBody),
					})

					if (!res.ok) {
						const text = await res.text()
						console.error("[Audit] Discord webhook failed:", res.status, text)
					}
				} catch (err) {
					console.error("[Audit] Webhook error:", err)
				}
			}

		}
	} catch (e) {
		console.error('[Audit] Failed to log audit', e);
	}
}

export async function queryAudit(workspaceGroupId: number, opts: { userId?: number; action?: string; search?: string; skip?: number; take?: number } = {}) {
	const where: any = { workspaceGroupId };
	if (opts.userId) where.userId = BigInt(opts.userId);
	if (opts.action) where.action = opts.action;
	if (opts.search) {
		where.OR = [
			{ action: { contains: opts.search, mode: 'insensitive' } },
			{ entity: { contains: opts.search, mode: 'insensitive' } },
			{ details: { path: [], array_contains: [] } },
		];
	}

	try {
		const p: any = prisma as any;
		if (p && p.auditLog) {
			const [rows, total] = await Promise.all([
				p.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: opts.skip || 0, take: opts.take || 50 }),
				p.auditLog.count({ where }),
			]);
			const sanitize = (v: any): any => {
				if (v === null || v === undefined) return v;
				if (typeof v === 'bigint') return v.toString();
				if (Array.isArray(v)) return v.map(sanitize);
				if (v instanceof Date) return v.toISOString();
				if (typeof v === 'object') {
					const out: any = {};
					for (const k of Object.keys(v)) out[k] = sanitize(v[k]);
					return out;
				}
				return v;
			};

			return { rows: rows.map(sanitize), total };
		}

		const clauses: string[] = ['"workspaceGroupId" = $1'];
		const params: any[] = [workspaceGroupId];
		let idx = 2;
		if (opts.userId) {
			clauses.push(`"userId" = $${idx++}`);
			params.push(BigInt(opts.userId));
		}
		if (opts.action) {
			clauses.push(`"action" = $${idx++}`);
			params.push(opts.action);
		}
		if (opts.search) {
			clauses.push(`(LOWER("action") LIKE LOWER($${idx}) OR LOWER(COALESCE("entity", '')) LIKE LOWER($${idx}) OR LOWER(COALESCE(CAST("details" AS TEXT), '')) LIKE LOWER($${idx}))`);
			params.push(`%${opts.search}%`);
			idx++;
		}

		const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
		const take = opts.take || 50;
		const skip = opts.skip || 0;

		const rows: any[] = await prisma.$queryRawUnsafe(
			`SELECT * FROM "AuditLog" ${whereSql} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`,
			...params
		);

		const countRes: any = await prisma.$queryRawUnsafe(
			`SELECT COUNT(*)::int AS cnt FROM "AuditLog" ${whereSql}`,
			...params
		);
		const total = Array.isArray(countRes) && countRes[0] ? Number(countRes[0].cnt || countRes[0].count || 0) : 0;

		return { rows, total };
	} catch (e) {
		console.error('[Audit] Error querying audits', e);
		throw e;
	}
}

export default { logAudit, queryAudit };
