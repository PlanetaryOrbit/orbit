import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

export default withSessionRoute(handler);

async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	if (!req.session.userid) {
		return res.status(401).json({ error: 'Not authenticated' });
	}

	try {
		const robloxUserId = BigInt(req.session.userid);

		const discordEntry = await prisma.discordUser.findFirst({
			where: { robloxUserId },
		});

		if (!discordEntry) {
			return res.status(404).json({ error: 'No Discord account linked' });
		}

		await prisma.discordUser.delete({
			where: { discordUserId: discordEntry.discordUserId },
		});

		delete req.session.discordid;
		await req.session.save();

		return res.status(200).json({ success: true });
	} catch (err) {
		console.error('Discord unlink error:', err);
		return res.status(500).json({ error: 'Failed to unlink Discord account' });
	}
}
