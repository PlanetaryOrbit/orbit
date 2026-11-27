import type { AuthenticatedRequest } from '@/lib/withAuth';
import prisma from '@/utils/database';
import { createOAuthState } from '@/utils/oauth';
import { getCanonicalOrigin, redirectToCanonicalOrigin } from '@/utils/origin';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (redirectToCanonicalOrigin(req, res, '/api/auth/roblox/start')) return;

  if (req.auth) {
    return res.redirect('/');
  }

  let clientId: string | undefined;
  let redirectUri: string | undefined;
  clientId = process.env.ROBLOX_CLIENT_ID;
  const origin = getCanonicalOrigin();
  redirectUri = origin ? `${origin}/api/auth/roblox/callback` : undefined;
  if (!clientId || !redirectUri) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: { in: ['robloxClientId'] },
        },
      });
      const configMap = configs.reduce(
        (acc, config) => {
          acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
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

  const state = await createOAuthState(req, res, 'roblox');

  const authUrl = new URL('https://apis.roblox.com/oauth/v1/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid profile');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  res.redirect(authUrl.toString());
}
