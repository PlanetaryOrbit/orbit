import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession';

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'PATCH') return res.status(405).json({ success: false, error: 'Method not allowed' });

	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });

	const workspaceGroupId = parseInt(req.query.id as string, 10);
	if (!workspaceGroupId) return res.status(400).json({ success: false, error: 'Invalid workspace id' });

	const { introNote, introSong } = req.body as { introNote?: string; introSong?: string };

	const note = typeof introNote === 'string' ? introNote.trim().slice(0, 100) || null : null;
	const song = typeof introSong === 'string' ? introSong.trim().slice(0, 2000) || null : null;

	const member = await prisma.workspaceMember.findUnique({
		where: { workspaceGroupId_userId: { workspaceGroupId, userId: BigInt(req.session.userid) } },
	});

	if (!member) return res.status(403).json({ success: false, error: 'Not a member of this workspace' });

	await prisma.$executeRaw`
		UPDATE "workspaceMember"
		SET "introNote" = ${note}, "introSong" = ${song}
		WHERE "workspaceGroupId" = ${workspaceGroupId} AND "userId" = ${BigInt(req.session.userid)}
	`;

	return res.json({ success: true });
});
