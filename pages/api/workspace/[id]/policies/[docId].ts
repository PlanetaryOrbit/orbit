import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
	success: boolean
	error?: string
}

export default withPermissionCheck(handler, 'manage_policies');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' });

	const { id, docId } = req.query;

	if (!id || !docId) return res.status(400).json({ success: false, error: 'Missing required fields' });
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Unauthorized' });

	try {
		// First, get the document to check if it exists and get its details for audit log
		const document = await prisma.document.findFirst({
			where: {
				id: docId as string,
				workspaceGroupId: parseInt(id as string),
			}
		});

		if (!document) {
			return res.status(404).json({ success: false, error: 'Policy not found' });
		}

		// Delete the document (this will cascade delete acknowledgments and shareable links due to onDelete: Cascade in schema)
		await prisma.document.delete({
			where: {
				id: docId as string,
			}
		});

		// Log the deletion
		try {
			await logAudit(parseInt(id as string), Number(req.session.userid), 'policy.delete', `policy:${document.id}`, {
				documentId: document.id,
				documentName: document.name,
			});
		} catch (e) {
			// ignore audit log errors
		}

		res.status(200).json({ success: true });
	} catch (error: any) {
		console.error('Error deleting policy:', error);
		res.status(500).json({ success: false, error: 'Failed to delete policy' });
	}
}