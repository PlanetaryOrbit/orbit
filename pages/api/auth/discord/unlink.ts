import type { NextApiRequest, NextApiResponse } from 'next';
// import { withAuth } from '@/lib/withSession';
import prisma from '@/utils/database';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';

export default withAuth(handler);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	if (!req.auth.userId) {
		return res.status(401).json({ error: 'Not authenticated' });
	}

	try {
		const robloxUserId = BigInt(req.auth.userId);

		const discordEntry = await prisma.discordUser.findFirst({
			where: { robloxUserId },
		});

		if (!discordEntry) {
			return res.status(404).json({ error: 'No Discord account linked' });
		}

		await prisma.discordUser.delete({
			where: { discordUserId: discordEntry.discordUserId },
		});

		return res.status(200).json({ success: true });
	} catch (err) {
		console.error('Discord unlink error:', err);
		return res.status(500).json({ error: 'Failed to unlink Discord account' });
	}
}
