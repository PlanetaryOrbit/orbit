import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession';

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
	const workspaceGroupId = parseInt(req.query.id as string, 10);
	if (!workspaceGroupId) return res.status(400).json({ success: false, error: 'Invalid workspace id' });
	if (!req.session.userid) {
		return res.status(401).json({ success: false, error: 'Not logged in' });
	}

	const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
	const windowDays = isNaN(days) || days <= 0 || days > 30 ? 7 : days;

	const userid = Number(req.session.userid);
	
	const userRoles = await prisma.role.findMany({
		where: { 
			workspaceGroupId,
			members: { some: { userid: BigInt(userid) } }
		}
	});
	if (userRoles.length > 0) {
		try {
			await prisma.workspaceMember.upsert({
				where: { workspaceGroupId_userId: { workspaceGroupId, userId: userid } },
				create: { workspaceGroupId, userId: userid, joinDate: new Date() },
				update: {},
			});
		} catch (e) {}
	}

	const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

	const recent = await prisma.$queryRaw<Array<{
		userid: bigint;
		username: string | null;
		picture: string | null;
		joinDate: Date | null;
		introNote: string | null;
		introSong: string | null;
	}>>`
		SELECT u.userid, u.username, u.picture, wm."joinDate", wm."introNote", wm."introSong"
		FROM "workspaceMember" wm
		JOIN "user" u ON u.userid = wm."userId"
		WHERE wm."workspaceGroupId" = ${workspaceGroupId}
		  AND wm."joinDate" >= ${cutoff}
		ORDER BY wm."joinDate" DESC
	`;

	res.json({
		success: true,
		members: recent.map(r => ({
			userid: r.userid.toString(),
			username: r.username || r.userid.toString(),
			picture: r.picture,
			joinDate: r.joinDate,
			introNote: r.introNote ?? null,
			introSong: r.introSong ?? null,
		}))
	});
});
