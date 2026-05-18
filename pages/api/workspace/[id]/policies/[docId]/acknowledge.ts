import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { withPermissionCheck } from '@/utils/permissionsManager'
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';

type Data = {
	success: boolean
	error?: string
	acknowledgment?: any
}

export default withAuth(handler);

export async function handler(
	req: AuthenticatedRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { signature, ipAddress, acknowledgmentMethod } = req.body;
	const { id, docId } = req.query;

	if (!id || !docId) return res.status(400).json({ success: false, error: 'Missing required fields' });
	if (!req.auth.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

	// Check if user has access to this document
	const document = await prisma.document.findFirst({
		where: {
			id: docId as string,
			workspaceGroupId: parseInt(id as string),
			requiresAcknowledgment: true
		},
		select: {
			id: true,
			name: true,
			workspaceGroupId: true,
			requiresAcknowledgment: true,
			roles: {
				include: {
					members: true
				}
			},
			departments: {
				include: {
					departmentMembers: true
				}
			}
		}
	});

	if (!document) {
		return res.status(404).json({ success: false, error: 'Document not found' });
	}

	const userHasRoleAccess = document.roles.some(role => 
		role.members.some(member => member.userid.toString() === req.auth.userId.toString())
	);
	const userHasDepartmentAccess = document.departments.some(dept =>
		dept.departmentMembers.some(dm => 
			dm.userId.toString() === req.auth.userId.toString() &&
			dm.workspaceGroupId === parseInt(id as string)
		)
	);
	const noRestrictions = document.roles.length === 0 && document.departments.length === 0;
	
	if (!userHasRoleAccess && !userHasDepartmentAccess && !noRestrictions) {
		return res.status(403).json({ success: false, error: 'Access denied' });
	}

	// Check if already acknowledged
	const existingAcknowledgment = await prisma.policyAcknowledgment.findFirst({
		where: {
			userId: BigInt(req.auth.userId),
			documentId: docId as string
		}
	});

	if (existingAcknowledgment) {
		return res.status(400).json({ success: false, error: 'Policy already acknowledged' });
	}

	// Create acknowledgment
	const acknowledgment = await prisma.policyAcknowledgment.create({
		data: {
			userId: BigInt(req.auth.userId),
			documentId: docId as string,
			signature: signature || `Acknowledged by user at ${new Date().toISOString()}`,
			ipAddress: ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
			isRequired: document.requiresAcknowledgment
		}
	});

	try {
		await logAudit(parseInt(id as string), Number(req.auth.userId), 'policy.acknowledge', `policy:${document.id}`, {
			documentId: document.id,
			documentName: document.name,
			signature: signature ? 'provided' : 'default'
		});
	} catch (e) {
		// ignore
	}

	res.status(200).json({
		success: true,
		acknowledgment: JSON.parse(JSON.stringify(acknowledgment, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
	});
}