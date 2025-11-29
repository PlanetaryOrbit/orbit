import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
	success: boolean
	error?: string
	links?: any[]
	link?: any
}

export default withPermissionCheck(handler, 'manage_policies');

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	const { id, docId } = req.query;

	if (!id || !docId) return res.status(400).json({ success: false, error: 'Missing required fields' });

	// Verify the document exists
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

	if (req.method === 'GET') {
		// Get all links for this policy
		const links = await prisma.policyShareableLink.findMany({
			where: {
				documentId: docId as string,
				workspaceGroupId: parseInt(id as string)
			},
			include: {
				createdBy: {
					select: {
						username: true,
						picture: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		// Generate actual URLs for each link
		const protocol = req.headers['x-forwarded-proto'] ||
			(req.headers.host?.includes('localhost') ? 'http' : 'https');
		const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${req.headers.host}`;

		const linksWithUrls = links.map(link => ({
			...link,
			url: `${baseUrl}/workspace/${id}/policies/sign/${docId}`,
			isExpired: link.expiresAt ? new Date() > new Date(link.expiresAt) : false
		}));

		return res.status(200).json({
			success: true,
			links: JSON.parse(JSON.stringify(linksWithUrls, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
		});

	} else if (req.method === 'POST') {
		// Create a new link
		const { name, description, expiresInHours } = req.body;

		if (!name || !name.trim()) {
			return res.status(400).json({ success: false, error: 'Link name is required' });
		}

		let expiresAt = null;
		if (expiresInHours && expiresInHours > 0) {
			expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000));
		}

		const newLink = await prisma.policyShareableLink.create({
			data: {
				documentId: docId as string,
				workspaceGroupId: parseInt(id as string),
				name: name.trim(),
				description: description?.trim() || null,
				createdById: BigInt(req.session.userid),
				expiresAt
			},
			include: {
				createdBy: {
					select: {
						username: true,
						picture: true
					}
				}
			}
		});

		// Generate the URL
		const protocol = req.headers['x-forwarded-proto'] ||
			(req.headers.host?.includes('localhost') ? 'http' : 'https');
		const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${req.headers.host}`;
		const url = `${baseUrl}/workspace/${id}/policies/sign/${docId}`;

		try {
			await logAudit(parseInt(id as string), Number(req.session.userid), 'policy.link_created', `policy:${docId}`, {
				linkId: newLink.id,
				linkName: newLink.name,
				documentId: docId,
				documentName: document.name,
				expiresAt: newLink.expiresAt?.toISOString()
			});
		} catch (e) {
			// ignore audit log errors
		}

		return res.status(201).json({
			success: true,
			link: {
				...JSON.parse(JSON.stringify(newLink, (key, value) => (typeof value === 'bigint' ? value.toString() : value))),
				url,
				isExpired: false
			}
		});

	} else if (req.method === 'DELETE') {
		// Delete a link
		const { linkId } = req.body;

		if (!linkId) {
			return res.status(400).json({ success: false, error: 'Link ID is required' });
		}

		// Verify the link exists and belongs to this document
		const linkToDelete = await prisma.policyShareableLink.findFirst({
			where: {
				id: linkId,
				documentId: docId as string,
				workspaceGroupId: parseInt(id as string)
			}
		});

		if (!linkToDelete) {
			return res.status(404).json({ success: false, error: 'Link not found' });
		}

		await prisma.policyShareableLink.delete({
			where: {
				id: linkId
			}
		});

		try {
			await logAudit(parseInt(id as string), Number(req.session.userid), 'policy.link_deleted', `policy:${docId}`, {
				linkId: linkToDelete.id,
				linkName: linkToDelete.name,
				documentId: docId,
				documentName: document.name
			});
		} catch (e) {
			// ignore audit log errors
		}

		return res.status(200).json({ success: true });

	} else if (req.method === 'PATCH') {
		// Update a link (toggle active status, update name/description)
		const { linkId, isActive, name, description } = req.body;

		if (!linkId) {
			return res.status(400).json({ success: false, error: 'Link ID is required' });
		}

		// Verify the link exists and belongs to this document
		const linkToUpdate = await prisma.policyShareableLink.findFirst({
			where: {
				id: linkId,
				documentId: docId as string,
				workspaceGroupId: parseInt(id as string)
			}
		});

		if (!linkToUpdate) {
			return res.status(404).json({ success: false, error: 'Link not found' });
		}

		const updatedLink = await prisma.policyShareableLink.update({
			where: {
				id: linkId
			},
			data: {
				...(isActive !== undefined && { isActive }),
				...(name !== undefined && { name: name.trim() }),
				...(description !== undefined && { description: description?.trim() || null })
			},
			include: {
				createdBy: {
					select: {
						username: true,
						picture: true
					}
				}
			}
		});

		try {
			await logAudit(parseInt(id as string), Number(req.session.userid), 'policy.link_updated', `policy:${docId}`, {
				linkId: updatedLink.id,
				linkName: updatedLink.name,
				documentId: docId,
				documentName: document.name,
				changes: { isActive, name, description }
			});
		} catch (e) {
			// ignore audit log errors
		}

		// Generate the URL
		const protocol = req.headers['x-forwarded-proto'] ||
			(req.headers.host?.includes('localhost') ? 'http' : 'https');
		const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${req.headers.host}`;
		const url = `${baseUrl}/workspace/${id}/policies/sign/${docId}`;

		return res.status(200).json({
			success: true,
			link: {
				...JSON.parse(JSON.stringify(updatedLink, (key, value) => (typeof value === 'bigint' ? value.toString() : value))),
				url,
				isExpired: updatedLink.expiresAt ? new Date() > new Date(updatedLink.expiresAt) : false
			}
		});

	} else {
		return res.status(405).json({ success: false, error: 'Method not allowed' });
	}
}