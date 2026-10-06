import type { NextApiResponse } from 'next';

import { AuthenticatedRequest } from '@/lib/withAuth';
import prisma from '@/utils/database';

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

  const protocol =
    req.headers['x-forwarded-proto']?.toString().split(',')[0] ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  const hostname =
    req.headers['x-forwarded-host']?.toString().split(',')[0] ||
    req.headers.host;

  if (hostname) {
    redirectUri = `${protocol}://${hostname}/api/auth/roblox/callback`;
  }

  if (!clientId || !redirectUri) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: { in: ['robloxClientId'] },
        },
      });

      const configMap = configs.reduce(
        (acc, config) => {
          acc[config.key] =
            typeof config.value === 'string' ? config.value.trim() : config.value;

          return acc;
        },
        {} as Record<string, any>,
      );

      clientId = clientId || configMap.robloxClientId;
    } catch (error) {
      console.error('Failed to fetch OAuth config from database:', error);
    }
  }

  if (!clientId || !redirectUri) {
    console.error('Missing Roblox OAuth configuration');
    return res.status(500).json({ error: 'OAuth configuration error' });
  }

  const state =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  await prisma.oAuthState.create({
    data: {
      state,
      provider: 'roblox',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const authUrl = new URL('https://apis.roblox.com/oauth/v1/authorize');

  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid profile');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  return res.redirect(authUrl.toString());
}
