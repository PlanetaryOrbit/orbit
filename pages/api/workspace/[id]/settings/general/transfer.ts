import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database'
import { withSessionRoute } from '@/lib/withSession'
import { logAudit } from '@/utils/logs'

type Data = {
	success: boolean
	error?: string
}

export default withSessionRoute(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'PATCH') return res.status(405).json({ success: false, error: 'Method not allowed' })
	
	try {
		const workspaceId = parseInt(req.query.id as string);
		const userId = (req as any).session?.userid;
		const { newOwnerId } = req.body;

		if (!userId) return res.status(401).json({ success: false, error: 'Not logged in' });
		if (!workspaceId) return res.status(400).json({ success: false, error: 'No workspace id provided' });
		if (!newOwnerId) return res.status(400).json({ success: false, error: 'No new owner id provided' });
		const currentOwnerMembership = await prisma.workspaceMember.findUnique({
			where: {
				workspaceGroupId_userId: {
					workspaceGroupId: workspaceId,
					userId: userId,
				},
			},
		});

		if (!currentOwnerMembership?.isAdmin) {
			return res.status(403).json({ success: false, error: 'Only workspace owners can transfer ownership' });
		}
		const newOwnerMembership = await prisma.workspaceMember.findUnique({
			where: {
				workspaceGroupId_userId: {
					workspaceGroupId: workspaceId,
					userId: parseInt(newOwnerId as string),
				},
			},
		});
		if (!newOwnerMembership) {
			return res.status(404).json({ success: false, error: 'New owner is not a member of this workspace' });
		}
		if (newOwnerMembership.userId === userId) {
			return res.status(400).json({ success: false, error: 'New owner must be different from current owner' });
		}
		const currentOwnerUser = await prisma.user.findUnique({
			where: { userid: userId },
			include: { roles: true },
		});
		const newOwnerUser = await prisma.user.findUnique({
			where: { userid: parseInt(newOwnerId as string) },
			include: { roles: true },
		});
		await logAudit(workspaceId, userId, 'workspace.ownership.transfer', 'workspace', {
			previousOwnerId: userId,
			newOwnerId: parseInt(newOwnerId as string),
			previousOwnerUsername: currentOwnerUser?.username,
			newOwnerUsername: newOwnerUser?.username,
		}).catch(() => {});
		await prisma.workspaceMember.update({
			where: {
				workspaceGroupId_userId: {
					workspaceGroupId: workspaceId,
					userId: userId,
				},
			},
			data: { isAdmin: false },
		});
		await prisma.workspaceMember.update({
			where: {
				workspaceGroupId_userId: {
					workspaceGroupId: workspaceId,
					userId: parseInt(newOwnerId as string),
				},
			},
			data: { isAdmin: true },
		});
		return res.status(200).json({ success: true });
	} catch (error) {
		console.error('Failed to transfer workspace ownership:', error);
		return res.status(500).json({ success: false, error: 'Server error' });
	}
}
