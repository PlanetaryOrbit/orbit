import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { SessionType, document } from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { sanitizeJSON } from '@/utils/sanitise';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'

import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'

type Data = {
	success: boolean
	error?: string
	session?: SessionType
	document?: document
}

export default withPermissionCheck(handler, 'create_policies');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { name, content, roles, departments, assignToEveryone, requiresAcknowledgment, acknowledgmentDeadline, acknowledgmentMethod, acknowledgmentWord, isTrainingDocument } = req.body;
	if (!name || (!assignToEveryone && !roles && !departments)) return res.status(400).json({ success: false, error: 'Missing required fields' });

	const { id } = req.query;
	const policiesConfig = await getConfig('policies', parseInt(id as string));
	if (!policiesConfig?.enabled) {
		return res.status(404).json({ success: false, error: 'Policies feature not enabled' });
	}

	if (content && typeof content === 'object' && (content as any).external) {
		const url = (content as any).url;
		if (!url || typeof url !== 'string') return res.status(400).json({ success: false, error: 'External URL required' });
		if (!url.startsWith('https://')) return res.status(400).json({ success: false, error: 'External URL must use https://' });
	}

	if (!id) return res.status(400).json({ success: false, error: 'Missing required fields' });

	let saveContent = content;
	if (content && typeof content === 'object' && !(content as any).external) {
		saveContent = sanitizeJSON(content);
 	}

	let finalRoles = roles;
	let finalDepartments = departments;
	if (assignToEveryone) {
		const allRoles = await prisma.role.findMany({
			where: {
				workspaceGroupId: parseInt(id as string)
			},
			select: {
				id: true
			}
		});
		const allDepartments = await prisma.department.findMany({
			where: {
				workspaceGroupId: parseInt(id as string)
			},
			select: {
				id: true
			}
		});
		finalRoles = allRoles.map(role => role.id);
		finalDepartments = allDepartments.map(dept => dept.id);
	}

	const document = await prisma.document.create({
		data: {
			workspaceGroupId: parseInt(id as string),
			name,
			ownerId: BigInt(req.session.userid),
			content: saveContent,
			requiresAcknowledgment: requiresAcknowledgment || false,
			acknowledgmentDeadline: acknowledgmentDeadline ? new Date(acknowledgmentDeadline) : null,
			acknowledgmentMethod: acknowledgmentMethod || 'signature',
			acknowledgmentWord: acknowledgmentWord || null,
			assignToEveryone: assignToEveryone || false,
			isTrainingDocument: isTrainingDocument || false,
			roles: {
				connect: finalRoles ? finalRoles.map((role: string) => ({ id: role })) : []
			},
			departments: {
				connect: finalDepartments ? finalDepartments.map((department: string) => ({ id: department })) : []
			}
		}
	});

	try {
		await logAudit(parseInt(id as string), Number(req.session.userid), 'policy.create', `policy:${document.id}`, {
			id: document.id,
			name,
			assignToEveryone,
			roles: finalRoles,
			departments: finalDepartments,
			requiresAcknowledgment,
			isTrainingDocument
		});
	} catch (e) {
	}

	res.status(200).json({ success: true, document: JSON.parse(JSON.stringify(document, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) });
}