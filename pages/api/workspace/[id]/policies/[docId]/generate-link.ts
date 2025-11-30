import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { withPermissionCheck } from '@/utils/permissionsManager'
import crypto from 'crypto';

type Data = {
	success: boolean
	error?: string
	link?: string
	metadata?: {
		documentName: string
		expiresAt?: string
		createdAt: string
		token?: string
	}
}

export default withPermissionCheck(handler, 'manage_policies');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { id, docId } = req.query;
	const { expiresInHours = 24, requiresAuth = true } = req.body;

	if (!id || !docId) return res.status(400).json({ success: false, error: 'Missing required fields' });

	// Verify the document exists and requires acknowledgment
	const document = await prisma.document.findFirst({
		where: {
			id: docId as string,
			workspaceGroupId: parseInt(id as string),
			requiresAcknowledgment: true
		}
	});

	if (!document) {
		return res.status(404).json({ success: false, error: 'Policy document not found' });
	}

	// Generate the shareable link with proper protocol detection
	const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
	const directLink = `${baseUrl}/workspace/${id}/policies/sign/${docId}`;

	let secureToken: string | undefined = undefined;
	let expiresAt = null;

	// If additional security is requested, generate a signed token
	if (expiresInHours && expiresInHours > 0) {
		expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));

		// Generate a secure token (in a real system, you might want to store these in the database)
		secureToken = crypto
			.createHmac('sha256', process.env.SECRET_KEY || 'default-secret')
			.update(`${docId}:${id}:${expiresAt.getTime()}`)
			.digest('hex');
	}

	// For now, we'll use the direct link (in a real system you might want to add token-based security)
	const shareableLink = directLink;

	try {
		await logAudit(parseInt(id as string), Number(req.session.userid), 'policy.link_generated', `policy:${docId}`, {
			documentId: docId,
			documentName: document.name,
			linkType: 'direct',
			expiresAt: expiresAt?.toISOString(),
			generatedBy: req.session.userid
		});
	} catch (e) {
		// ignore audit log errors
	}

	res.status(200).json({
		success: true,
		link: shareableLink,
		metadata: {
			documentName: document.name,
			expiresAt: expiresAt?.toISOString(),
			createdAt: new Date().toISOString(),
			...(secureToken && { token: secureToken })
		}
	});
}