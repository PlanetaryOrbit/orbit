import type { AuthenticatedRequest } from '@/lib/withAuth';
import prisma from '@/utils/database';
import { getSessionByToken } from '@/utils/session';
import * as cookie from 'cookie';
import type { NextApiResponse } from 'next';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isLink = req.query.link === '1';
  let linkUserId: bigint | null = null;

  if (isLink) {
    const sessionToken = cookie.parse(req.headers.cookie || '').session_token;
    if (!sessionToken) {
      return res.redirect('/settings?tab=connections&error=auth_required');
    }

    const session = await getSessionByToken(sessionToken);
    if (!session) {
      return res.redirect('/settings?tab=connections&error=auth_required');
    }

    linkUserId = session.userId;
  }

  let clientId: string | undefined;
  clientId = process.env.DISCORD_APPLICATION_ID;
  if (!clientId) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: { in: ['discordAppID'] },
        },
      });
      const configMap = configs.reduce(
        (acc, config) => {
          acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
          return acc;
        },
        {} as Record<string, any>,
      );
      clientId = clientId || configMap.discordAppID;
    } catch (error) {
      console.error('Failed to fetch OAuth config from database:', error);
    }
  }

  if (!clientId) {
    console.error('Missing Discord OAuth configuration');
    return res.status(500).json({ error: 'OAuth configuration error' });
  }

  const state =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  await prisma.oAuthState.create({
    data: {
      state,
      provider: 'discord',
      userId: linkUserId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  const authUrl = new URL('https://discord.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set(
    'redirect_uri',
    `${process.env.PLANETARY_CLOUD_URL ? `https://${process.env.PLANETARY_CLOUD_URL}` : process.env.NEXTAUTH_URL || process.env.PUBLIC_URL}/api/auth/discord/callback`,
  );
  authUrl.searchParams.set('scope', 'identify');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', state);

  res.redirect(authUrl.toString());
}
