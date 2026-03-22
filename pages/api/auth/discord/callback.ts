import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import axios from 'axios';
import Package from '@/package.json'
import prisma from '@/utils/database';

type DiscordTokenResponse = {
	access_token: string;
	token_type: string;
	expires_in: 604800;
	refresh_token: string;
};

type DiscordUserResponse = {
	id: string;
	username: string;
	avatar: string;
};

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const { code, state, error } = req.query;

	if (error) {
		console.error('OAuth error:', error);
		return res.redirect('/login?error=oauth_error');
	}
	if (!code || !state) {
		return res.redirect('/login?error=missing_params');
	}
	if (state !== req.session.oauthState) {
		console.error('OAuth state mismatch');
		return res.redirect('/login?error=state_mismatch');
	}

	const originUrl = req.headers.host;
	const isLocalhost = originUrl?.includes('localhost');
	const baseUrl = `${isLocalhost ? 'http://' : 'https://'}${originUrl}`;

	let clientId: string | undefined = process.env.DISCORD_APPLICATION_ID;
	let clientSecret: string | undefined = process.env.DISCORD_SECRET;

	if (!clientId || !clientSecret) {
		try {
			const configs = await prisma.instanceConfig.findMany({
				where: { key: { in: ['discordAppID', 'discordAppSecret'] } },
			});

			const configMap = configs.reduce((acc, config) => {
				acc[config.key] =
					typeof config.value === 'string' ? config.value.trim() : config.value;
				return acc;
			}, {} as Record<string, any>);

			clientId = clientId || configMap.discordAppID;
			clientSecret = clientSecret || configMap.discordAppSecret;
		} catch (err) {
			console.error('Failed to fetch OAuth config from database:', err);
		}
	}

	if (!clientId || !clientSecret) {
		console.error('Missing Discord OAuth configuration');
		return res.redirect('/login?error=config_error');
	}

	try {
		const tokenResponse = await axios.post<DiscordTokenResponse>(
			'https://discord.com/api/v10/oauth2/token',
			new URLSearchParams({
				grant_type: 'authorization_code',
				code: code as string,
				redirect_uri: `${baseUrl}/api/auth/discord/callback`,
				client_id: clientId,
				client_secret: clientSecret,
			}),
			{ headers: { 
				'Content-Type': 'application/x-www-form-urlencoded',
				'User-Agent': `orbit/${Package.version}`
			} 
		}
		);

		const { access_token, refresh_token, expires_in } = tokenResponse.data;

		const userResponse = await axios.get<DiscordUserResponse>(
			'https://discord.com/api/v10/users/@me',
			{ headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': `orbit/${Package.version}` } }
		);

		const discordUser = userResponse.data;
		const discordUserIdBig = BigInt(discordUser.id);

		const hasEntry = await prisma.discordUser.findUnique({
			where: { discordUserId: discordUserIdBig },
		});

		if (!hasEntry && !req.session.userid) {
			return res.redirect('/login?error=discord-not-linked');
		}

		req.session.discordid = discordUser.id;
		delete req.session.oauthState;
		await req.session.save();

		const entry = await prisma.discordUser.upsert({
			where: { discordUserId: discordUserIdBig },
			update: {
				username: discordUser.username,
				avatar: discordUser.avatar,
				accessToken: access_token,
				refreshToken: refresh_token,
				expireToken: new Date(Date.now() + expires_in * 1000),
				...(req.session.userid && { robloxUserId: BigInt(req.session.userid) }),
			},
			create: {
				discordUserId: discordUserIdBig,
				username: discordUser.username,
				avatar: discordUser.avatar,
				accessToken: access_token,
				refreshToken: refresh_token,
				expireToken: new Date(Date.now() + expires_in * 1000),
				robloxUserId: req.session.userid ? BigInt(req.session.userid) : null,
			},
		});

		if (entry.robloxUserId) {
			const robloxEntry = await prisma.user.findUnique({
				where: { userid: entry.robloxUserId },
			});

			if (robloxEntry) {
				req.session.userid = robloxEntry.userid.toString() as any;
				await req.session.save();
				return res.redirect('/');
			}
		}

		if (req.session.userid) {
			return res.redirect('/?action=linked');
		}

		return res.redirect('/login?error=discord-not-linked');

	} catch (err) {
		console.error('OAuth callback error:', err);

		if (axios.isAxiosError(err)) {
			console.error('Response data:', err.response?.data);
			console.error('Response status:', err.response?.status);
		}
		return res.redirect('/?error=link-fail');
	}
}
