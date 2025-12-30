import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';
import axios from 'axios';
import * as noblox from 'noblox.js';
import { getRobloxThumbnail } from '@/utils/roblox';

export default withSessionRoute(handler);

interface RobloxTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

interface RobloxUserInfo {
  sub: string;
  name: string;
  nickname: string;
  preferred_username: string;
  profile: string;
  picture: string;
}

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

	let clientId: string | undefined;
	let clientSecret: string | undefined;
	let redirectUri: string | undefined;

	clientId = process.env.ROBLOX_CLIENT_ID;
	clientSecret = process.env.ROBLOX_CLIENT_SECRET;
	redirectUri = process.env.ROBLOX_REDIRECT_URI;
	const usingEnvVars = !!(clientId && clientSecret && redirectUri);

	if (!clientId || !clientSecret || !redirectUri) {
		try {
			const configs = await prisma.instanceConfig.findMany({
				where: {
					key: { in: ['robloxClientId', 'robloxClientSecret', 'robloxRedirectUri'] }
				}
			});

			const configMap = configs.reduce((acc, config) => {
				acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
				return acc;
			}, {} as Record<string, any>);

			clientId = clientId || configMap.robloxClientId;
			clientSecret = clientSecret || configMap.robloxClientSecret;
			redirectUri = redirectUri || configMap.robloxRedirectUri;
			
			console.log('OAuth config loaded from database:', {
				clientIdPresent: !!clientId,
				clientIdLength: clientId?.length || 0,
				clientSecretPresent: !!clientSecret,
				clientSecretLength: clientSecret?.length || 0,
				redirectUri: redirectUri
			});
		} catch (error) {
			console.error('Failed to fetch OAuth config from database:', error);
		}
	}

	if (usingEnvVars) {
		console.log('Using OAuth credentials from environment variables');
	}

	if (!clientId || !clientSecret || !redirectUri) {
		console.error('Missing Roblox OAuth configuration:', {
			clientId: clientId ? 'present' : 'missing',
			clientSecret: clientSecret ? 'present' : 'missing',
			redirectUri: redirectUri || 'missing'
		});
		return res.redirect('/login?error=config_error');
	}
	
	if (clientId && clientId.length < 10) {
		console.error('Client ID appears invalid (too short):', clientId.length, 'characters');
	}
	if (clientSecret && clientSecret.length < 20) {
		console.error('Client Secret appears invalid (too short):', clientSecret.length, 'characters');
	}

	try {
		console.log('Attempting token exchange with:', {
			clientIdLength: clientId.length,
			clientSecretLength: clientSecret.length,
			redirectUri,
			codePresent: !!code
		});
		
		const tokenResponse = await axios.post<RobloxTokenResponse>(
		'https://apis.roblox.com/oauth/v1/token',
		new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'authorization_code',
			code: code as string,
			redirect_uri: redirectUri,
		}),
		{
			headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			},
		}
		);

		const { access_token } = tokenResponse.data;

		const userResponse = await axios.get<RobloxUserInfo>(
		'https://apis.roblox.com/oauth/v1/userinfo',
			{
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			}
		);

		const userInfo = userResponse.data;
		const userId = parseInt(userInfo.sub, 10);

		if (!userId || isNaN(userId)) {
		console.error('Invalid user ID from Roblox:', userInfo.sub);
		return res.redirect('/login?error=invalid_user');
		}

		let thumbnail = await getRobloxThumbnail(userId);
		if (!thumbnail) thumbnail = undefined;

		const username = userInfo.preferred_username || userInfo.name;
		const displayName = userInfo.nickname || username;
		try {
		await prisma.user.upsert({
			where: {
				userid: BigInt(userId),
			},
			update: {
				username: username || undefined,
				picture: thumbnail,
				registered: true,
			},
			create: {
				userid: BigInt(userId),
				username: username || undefined,
				picture: thumbnail,
				registered: true,
			},
		});

		req.session.userid = userId;
		await req.session.save();
		delete req.session.oauthState;
		await req.session.save();

		res.redirect('/');
		} catch (prismaError) {
		console.error('Database error during OAuth login:', prismaError);
		return res.redirect('/login?error=database_error');
		}
	} catch (error) {
		console.error('OAuth callback error:', error);
		if (axios.isAxiosError(error)) {
			console.error('Response data:', error.response?.data);
			console.error('Response status:', error.response?.status);
			console.error('Request config:', {
				url: error.config?.url,
				method: error.config?.method,
				headers: error.config?.headers
			});
			if (error.response?.data?.error === 'invalid_grant' || 
			    error.response?.data?.error_description?.includes('Client credentials')) {
				console.error('Credential validation failed. Check if:', {
					clientIdStartsWith: clientId?.substring(0, 10) + '...',
					clientSecretStartsWith: clientSecret?.substring(0, 10) + '...',
					redirectUriMatches: redirectUri,
					note: 'Ensure credentials in database match exactly with Roblox OAuth app settings'
				});
			}
		}
		return res.redirect('/login?error=oauth_failed');
	}
}