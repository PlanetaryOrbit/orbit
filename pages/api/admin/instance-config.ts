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
		const envClientId = process.env.ROBLOX_CLIENT_ID;
		const envClientSecret = process.env.ROBLOX_CLIENT_SECRET;
		const envRedirectUri = process.env.ROBLOX_REDIRECT_URI;
		const envOAuthOnly = process.env.ROBLOX_OAUTH_ONLY === 'true';
		const envWorkspaceRedirect = process.env.ROBLOX_WORKSPACE_REDIRECTID ? true : false;
		const envWorkspaceID = process.env.ROBLOX_WORKSPACE_REDIRECTID;
		const envDiscordAppID = process.env.DISCORD_APPLICATION_ID;
		const envDCClientSecret = process.env.DISCORD_SECRET;
		const usingEnvVars = !!((envClientId && envClientSecret) || envRedirectUri || envWorkspaceID || (envDiscordAppID && envDCClientSecret));

		if (usingEnvVars) {
			return res.json({
				robloxClientId: '••••••••',
				robloxClientSecret: '••••••••',
				robloxRedirectUri: envRedirectUri,
				discordApplicationID: envDiscordAppID ? '••••••••' : '',
				discordClientSecret: envDCClientSecret ? '••••••••' : '',
				oauthOnlyLogin: envOAuthOnly,
				redirectWorkspace: envWorkspaceRedirect,
				redirectWID: envWorkspaceID,
				usingEnvVars: true
			});
		}

		const configs = await prisma.instanceConfig.findMany({
			where: {
				key: {
					in: ['robloxClientId', 'robloxClientSecret', 'robloxRedirectUri', 'oauthOnlyLogin', 'redirectWorkspace', 'discordAppID', 'discordAppSecret']
				}
			}
		});

		const configMap = configs.reduce((acc:any, config:any) => {
			acc[config.key] = config.value;
			return acc;
		}, {} as Record<string, any>);  

		return res.json({
			robloxClientId: configMap.robloxClientId || '',
			robloxClientSecret: configMap.robloxClientSecret || '',
			robloxRedirectUri: configMap.robloxRedirectUri || '',
			oauthOnlyLogin: configMap.oauthOnlyLogin || false,
			discordApplicationID: configMap.discordAppID,
			discordClientSecret: configMap.discordAppSecret,
			usingEnvVars: false,
			redirectWorkspace: configMap.redirectWorkspace || ''
		});
		} catch (error) {
		console.error('Failed to fetch instance config:', error);
		return res.status(500).json({ error: 'Failed to fetch configuration' });
		}
	}

	if (req.method === 'POST') {
		const envClientId = process.env.ROBLOX_CLIENT_ID;
		const envClientSecret = process.env.ROBLOX_CLIENT_SECRET;
		const envRedirectUri = process.env.ROBLOX_REDIRECT_URI;
		const envWorkspaceID = process.env.ROBLOX_WORKSPACE_REDIRECTID;
		const envDiscordAppID = process.env.DISCORD_APPLICATION_ID;
		const envDCClientSecret = process.env.DISCORD_SECRET;
		const usingEnvVars = !!((envClientId && envClientSecret) || envRedirectUri || envWorkspaceID || (envDiscordAppID && envDCClientSecret));

		if (usingEnvVars) {
			return res.status(403).json({ 
				error: 'Cannot modify OAuth configuration when environment variables are set',
				usingEnvVars: true 
			});
		}

		const { robloxClientId, robloxClientSecret, robloxRedirectUri, oauthOnlyLogin, redirectWorkspaceID, discordAppId, discordSecret } = req.body;

		try {
			const updates = [
				{ key: 'robloxClientId', value: typeof robloxClientId === 'string' ? robloxClientId.trim() : (robloxClientId || '') },
				{ key: 'robloxClientSecret', value: typeof robloxClientSecret === 'string' ? robloxClientSecret.trim() : (robloxClientSecret || '') },
				{ key: 'robloxRedirectUri', value: typeof robloxRedirectUri === 'string' ? robloxRedirectUri.trim() : (robloxRedirectUri || '') },
				{ key: 'discordAppID', value: typeof discordAppId === 'string' ? discordAppId.trim() : (discordAppId || '') },
				{ key: 'discordAppSecret', value: typeof discordSecret === 'string' ? discordSecret.trim() : (discordSecret || '') },
				{ key: 'oauthOnlyLogin', value: oauthOnlyLogin || false }
			];

			if (redirectWorkspaceID) {
				updates.push(
					{
						key: 'redirectWorkspace',
						value: typeof redirectWorkspaceID === 'string' && redirectWorkspaceID.length > 0 ? redirectWorkspaceID.trim() : ''
					}
				)			
			} 

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