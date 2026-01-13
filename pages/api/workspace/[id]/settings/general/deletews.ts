import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database'
import { withPermissionCheck } from '@/utils/permissionsManager'

type Data = {
	success: boolean
	error?: string
}

export default withPermissionCheck(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'DELETE') return res.status(405).json({ success: false, error: 'Method not allowed' })
	
	try {
		const workspaceId = parseInt(req.query.id as string);
		const userId = (req as any).session?.userid;

		if (!userId) return res.status(401).json({ success: false, error: 'Not logged in' });
		if (!workspaceId) return res.status(400).json({ success: false, error: 'No workspace id provided' });
		const membership = await prisma.workspaceMember.findUnique({
			where: {
				workspaceGroupId_userId: {
					workspaceGroupId: workspaceId,
					userId: userId,
				},
			},
		});

		if (!membership?.isAdmin) {
			return res.status(403).json({ success: false, error: 'Only workspace owners can delete the workspace' });
		}

		const workspace = await prisma.workspace.findUnique({
			where: { groupId: workspaceId },
		});

		if (!workspace) {
			return res.status(404).json({ success: false, error: 'Workspace not found' });
		}

		await prisma.activitySession.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.activityHistory.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.activityAdjustment.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.activityReset.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.sessionNote.deleteMany({
			where: {
				session: {
					sessionType: {
						workspaceGroupId: workspaceId,
					},
				},
			},
		});
		await prisma.sessionLog.deleteMany({
			where: {
				session: {
					sessionType: {
						workspaceGroupId: workspaceId,
					},
				},
			},
		});
		await prisma.sessionUser.deleteMany({
			where: {
				session: {
					sessionType: {
						workspaceGroupId: workspaceId,
					},
				},
			},
		});
		await prisma.session.deleteMany({
			where: {
				sessionType: {
					workspaceGroupId: workspaceId,
				},
			},
		});
		await prisma.schedule.deleteMany({
			where: {
				sessionType: {
					workspaceGroupId: workspaceId,
				},
			},
		});
		await prisma.sessionType.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.policyAcknowledgment.deleteMany({
			where: {
				document: {
					workspaceGroupId: workspaceId,
				},
			},
		});
		await prisma.policyShareableLink.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.document.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.roleMember.deleteMany({
			where: {
				role: {
					workspaceGroupId: workspaceId,
				},
			},
		});
		await prisma.quotaRole.deleteMany({
			where: {
				quota: {
					workspaceGroupId: workspaceId,
				},
			},
		});
		await prisma.quota.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.role.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.departmentMember.deleteMany({
			where: {
				department: {
					workspaceGroupId: workspaceId,
				},
			},
		});
		await prisma.quotaDepartment.deleteMany({
			where: {
				department: {
					workspaceGroupId: workspaceId,
				},
			},
		});
		await prisma.department.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.wallPost.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.userBook.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.rank.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.inactivityNotice.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.apiKey.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.allyVisit.deleteMany({
			where: {
				ally: {
					workspaceGroupId: workspaceId,
				},
			},
		});
		await prisma.ally.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.savedView.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.workspaceExternalServices.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.config.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.workspaceMember.deleteMany({ where: { workspaceGroupId: workspaceId } });
		await prisma.workspace.delete({
			where: { groupId: workspaceId },
		});

		return res.status(200).json({ success: true });
	} catch (error) {
		console.error('Failed to delete workspace:', error);
		return res.status(500).json({ success: false, error: 'Server error' });
	}
}
