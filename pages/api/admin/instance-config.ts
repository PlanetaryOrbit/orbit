import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (!req.session.userid) {
		return res.status(401).json({ error: 'Not authenticated' });
	}

	const user = await prisma.user.findUnique({
		where: { userid: BigInt(req.session.userid) },
		select: { isOwner: true }
	});

	if (!user?.isOwner) {
		return res.status(403).json({ error: 'Access denied. Owner privileges required.' });
	}

	if (req.method === 'GET') {
		try {
		const configs = await prisma.instanceConfig.findMany({
			where: {
				key: {
					in: ['robloxClientId', 'robloxClientSecret', 'robloxRedirectUri']
				}
			}
		});

		const configMap = configs.reduce((acc, config) => {
			acc[config.key] = config.value;
			return acc;
		}, {} as Record<string, any>);

		return res.json({
			robloxClientId: configMap.robloxClientId || '',
			robloxClientSecret: configMap.robloxClientSecret || '',
			robloxRedirectUri: configMap.robloxRedirectUri || ''
		});
		} catch (error) {
		console.error('Failed to fetch instance config:', error);
		return res.status(500).json({ error: 'Failed to fetch configuration' });
		}
	}

	if (req.method === 'POST') {
		const { robloxClientId, robloxClientSecret, robloxRedirectUri } = req.body;

		try {
			const updates = [
				{ key: 'robloxClientId', value: robloxClientId || '' },
				{ key: 'robloxClientSecret', value: robloxClientSecret || '' },
				{ key: 'robloxRedirectUri', value: robloxRedirectUri || '' }
			];

			await Promise.all(
				updates.map(({ key, value }) =>
					prisma.instanceConfig.upsert({
						where: { key },
						update: { value, updatedAt: new Date() },
						create: { key, value, updatedAt: new Date() }
					})
				)
			);
			return res.json({ success: true, message: 'Configuration saved successfully' });
		} catch (error) {
			console.error('Failed to save instance config:', error);
			return res.status(500).json({ error: 'Failed to save configuration' });
		}
	}

	return res.status(405).json({ error: 'Method not allowed' });
}