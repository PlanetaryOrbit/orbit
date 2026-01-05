import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { sanitizeJSON } from '@/utils/sanitise';
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
	success: boolean
	error?: string
	document?: any
}

export default withPermissionCheck(handler, 'edit_policies');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'PUT') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const {
		name,
		content,
		roles,
		departments,
		assignToEveryone,
		requiresAcknowledgment,
		acknowledgmentDeadline,
		acknowledgmentMethod,
		acknowledgmentWord,
		isTrainingDocument,
		incrementVersion
	} = req.body;
	const { id, docId } = req.query;

	if (!id || !docId) return res.status(400).json({ success: false, error: 'Missing required fields' });

	const existingDoc = await prisma.document.findFirst({
		where: {
			id: docId as string,
			workspaceGroupId: parseInt(id as string)
		}
	});

	if (!existingDoc) {
		return res.status(404).json({ success: false, error: 'Document not found' });
	}

	let saveContent = content;
	if (content && typeof content === 'object' && !(content as any).external) {
		saveContent = sanitizeJSON(content);
 	}

	if (content && typeof content === 'object' && (content as any).external) {
		const url = (content as any).url;
		if (!url || typeof url !== 'string') return res.status(400).json({ success: false, error: 'External URL required' });
		if (!url.startsWith('https://')) return res.status(400).json({ success: false, error: 'External URL must use https://' });
	}

	let finalRoles = roles;
	let finalDepartments = departments;
	if (assignToEveryone !== undefined) {
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
		} else {
			finalRoles = roles || [];
			finalDepartments = departments || [];
		}
	}


	const updatedDocument = await prisma.document.update({
		where: {
			id: docId as string
		},
		data: {
			...(name && { name }),
			...(content && { content: saveContent }),
			...(requiresAcknowledgment !== undefined && { requiresAcknowledgment }),
			...(acknowledgmentDeadline !== undefined && {
				acknowledgmentDeadline: acknowledgmentDeadline ? new Date(acknowledgmentDeadline) : null
			}),
			...(acknowledgmentMethod !== undefined && { acknowledgmentMethod }),
			...(acknowledgmentWord !== undefined && { acknowledgmentWord }),
			...(isTrainingDocument !== undefined && { isTrainingDocument }),
			...(assignToEveryone !== undefined && { assignToEveryone }),
			...(finalRoles && {
				roles: {
					set: finalRoles.map((roleId: string) => ({ id: roleId }))
				}
			}),
			...(finalDepartments && {
				departments: {
					set: finalDepartments.map((deptId: string) => ({ id: deptId }))
				}
			})
		},
		include: {
			roles: true,
			departments: true,
			owner: {
				select: {
					username: true,
					picture: true
				}
			}
		}
	});

	try {
		await logAudit(parseInt(id as string), Number(req.session.userid), 'policy.update', `policy:${docId}`, {
			documentId: docId,
			name,
			changesRequired: incrementVersion && requiresAcknowledgment
		});
	} catch (e) {
	}

	res.status(200).json({
		success: true,
		document: JSON.parse(JSON.stringify(updatedDocument, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
	});
}