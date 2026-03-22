import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const originUrl = req.headers.host

	let clientId: string | undefined;
	clientId = process.env.DISCORD_APPLICATION_ID;
	if (!clientId) {
		try {
			const configs = await prisma.instanceConfig.findMany({
				where: {
					key: { in: ['discordAppID'] }
				}
			});
			const configMap = configs.reduce((acc, config) => {
				acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
				return acc;
			}, {} as Record<string, any>);
			clientId = clientId || configMap.robloxClientId;
		} catch (error) {
			console.error('Failed to fetch OAuth config from database:', error);
		}
	}

	if (!clientId) {
		console.error('Missing Roblox OAuth configuration');
		return res.status(500).json({ error: 'OAuth configuration error' });
	}

	const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	req.session.oauthState = state;
	await req.session.save();

	const authUrl = new URL('https://discord.com/oauth2/authorize');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', `${originUrl?.includes('localhost') ? "http://" : "https://" }${originUrl}/api/auth/discord/callback`);
	authUrl.searchParams.set('scope', 'identify');
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('state', state);

	res.redirect(authUrl.toString());
}