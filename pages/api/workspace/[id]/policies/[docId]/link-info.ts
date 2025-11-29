import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
	success: boolean
	error?: string
	linkInfo?: {
		documentName: string
		directLink: string
		isPublic: boolean
		requiresAuthentication: boolean
		roles: string[]
	}
}

export default withPermissionCheck(handler, 'manage_policies');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { id, docId } = req.query;

	if (!id || !docId) return res.status(400).json({ success: false, error: 'Missing required fields' });

	// Get the document with role information
	const document = await prisma.document.findFirst({
		where: {
			id: docId as string,
			workspaceGroupId: parseInt(id as string),
			requiresAcknowledgment: true
		},
		include: {
			roles: {
				select: {
					id: true,
					name: true
				}
			}
		}
	});

	if (!document) {
		return res.status(404).json({ success: false, error: 'Policy document not found' });
	}

	// Generate the direct link with proper protocol detection
	const protocol = req.headers['x-forwarded-proto'] ||
		(req.headers.host?.includes('localhost') ? 'http' : 'https');
	const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${req.headers.host}`;
	const directLink = `${baseUrl}/workspace/${id}/policies/sign/${docId}`;

	res.status(200).json({
		success: true,
		linkInfo: {
			documentName: document.name,
			directLink,
			isPublic: false, // Always requires authentication to workspace
			requiresAuthentication: true,
			roles: document.roles.map(role => role.name)
		}
	});
}