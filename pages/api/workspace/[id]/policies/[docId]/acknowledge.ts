import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
	success: boolean
	error?: string
	acknowledgment?: any
}

export default withSessionRoute(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { signature, ipAddress, acknowledgmentMethod } = req.body;
	const { id, docId } = req.query;

	if (!id || !docId) return res.status(400).json({ success: false, error: 'Missing required fields' });
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Unauthorized' });

	// Check if user has access to this document
	const document = await prisma.document.findFirst({
		where: {
			id: docId as string,
			workspaceGroupId: parseInt(id as string),
			roles: {
				some: {
					members: {
						some: {
							userid: BigInt(req.session.userid)
						}
					}
				}
			}
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
			}
		}
	});

	if (!document) {
		return res.status(404).json({ success: false, error: 'Document not found or access denied' });
	}

	// Check if already acknowledged
	const existingAcknowledgment = await prisma.policyAcknowledgment.findFirst({
		where: {
			userId: BigInt(req.session.userid),
			documentId: docId as string
		}
	});

	if (existingAcknowledgment) {
		return res.status(400).json({ success: false, error: 'Policy already acknowledged' });
	}

	// Create acknowledgment
	const acknowledgment = await prisma.policyAcknowledgment.create({
		data: {
			userId: BigInt(req.session.userid),
			documentId: docId as string,
			signature: signature || `Acknowledged by user at ${new Date().toISOString()}`,
			ipAddress: ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown',
			isRequired: document.requiresAcknowledgment
		}
	});

	try {
		await logAudit(parseInt(id as string), Number(req.session.userid), 'policy.acknowledge', `policy:${document.id}`, {
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