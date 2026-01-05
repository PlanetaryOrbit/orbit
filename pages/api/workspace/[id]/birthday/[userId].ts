import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
	const workspaceGroupId = parseInt(req.query.id as string, 10);
	if (!workspaceGroupId) return res.status(400).json({ success: false, error: 'Invalid workspace id' });

	const actingUserId = req.session.userid ? Number(req.session.userid) : null;
	if (!actingUserId) return res.status(401).json({ success: false, error: 'Not logged in' });

	const targetUserId = parseInt(req.query.userId as string, 10);
	if (!targetUserId) return res.status(400).json({ success: false, error: 'Invalid target user id' });

	const membership = await prisma.workspaceMember.findUnique({
		where: { workspaceGroupId_userId: { workspaceGroupId, userId: actingUserId } },
		select: { userId: true }
	});
	if (!membership) return res.status(403).json({ success: false, error: 'Not a workspace member' });

	const actor = await prisma.user.findFirst({
		where: { userid: BigInt(actingUserId) },
		include: {
			roles: { where: { workspaceGroupId }, take: 1 },
			workspaceMemberships: { where: { workspaceGroupId }, take: 1 }
		}
	});
	
	const actorMembership = actor?.workspaceMemberships?.[0];
	const isAdmin = actorMembership?.isAdmin || false;
	const actorRole = actor?.roles?.[0];
	const perms = actorRole?.permissions || [];
	const allowed = isAdmin || perms.includes('manage_users') || perms.includes('manage_workspace');
	if (!allowed) return res.status(403).json({ success: false, error: 'Insufficient permissions' });

	if (req.method === 'GET') {
		const member = await prisma.workspaceMember.findUnique({
		where: { workspaceGroupId_userId: { workspaceGroupId, userId: targetUserId } },
		select: { birthdayDay: true, birthdayMonth: true }
		});
		return res.json({ success: true, birthdayDay: member?.birthdayDay ?? null, birthdayMonth: member?.birthdayMonth ?? null });
	}

	if (req.method === 'PUT') {
		const { day, month } = req.body || {};
		if (
		(day !== 0 && (typeof day !== 'number' || day < 1 || day > 31)) ||
		(month !== 0 && (typeof month !== 'number' || month < 1 || month > 12))
		) {
		return res.status(400).json({ success: false, error: 'Invalid day or month' });
		}
		await prisma.workspaceMember.upsert({
		where: { workspaceGroupId_userId: { workspaceGroupId, userId: targetUserId } },
		update: { birthdayDay: day, birthdayMonth: month },
		create: { workspaceGroupId, userId: targetUserId, birthdayDay: day, birthdayMonth: month },
		});
		return res.json({ success: true });
	}

	return res.status(405).json({ success: false, error: 'Method not allowed' });
});
