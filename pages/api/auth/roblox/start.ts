import type { NextApiRequest, NextApiResponse } from 'next';
// import { withAuth } from '@/lib/withSession';
import prisma from '@/utils/database';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	if (req.auth) {
		return res.redirect('/');
	}

	let clientId: string | undefined;
	let redirectUri: string | undefined;
	clientId = process.env.ROBLOX_CLIENT_ID;
	redirectUri = process.env.ROBLOX_REDIRECT_URI;
	if (!clientId || !redirectUri) {
		try {
			const configs = await prisma.instanceConfig.findMany({
				where: {
					key: { in: ['robloxClientId', 'robloxRedirectUri'] }
				}
			});
			const configMap = configs.reduce((acc, config) => {
				acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
				return acc;
			}, {} as Record<string, any>);
			clientId = clientId || configMap.robloxClientId;
			redirectUri = redirectUri || configMap.robloxRedirectUri;
		} catch (error) {
			console.error('Failed to fetch OAuth config from database:', error);
		}
	}

	if (!clientId || !redirectUri) {
		console.error('Missing Roblox OAuth configuration');
		return res.status(500).json({ error: 'OAuth configuration error' });
	}

	const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	await prisma.oAuthState.create({
    data: {
      state,
      provider: 'roblox',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    },
  });

	const authUrl = new URL('https://apis.roblox.com/oauth/v1/authorize');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	authUrl.searchParams.set('scope', 'openid profile');
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('state', state);

	res.redirect(authUrl.toString());
}