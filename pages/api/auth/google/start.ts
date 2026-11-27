import prisma from '@/utils/database';
import { createOAuthState } from '@/utils/oauth';
import { getSessionByToken } from '@/utils/session';
import * as cookie from 'cookie';
import { google } from 'googleapis';
import type { NextApiRequest, NextApiResponse } from 'next';

function getRedirectUri(): string | null {
  const cloudUrl = process.env.PLANETARY_CLOUD_URL;
  const configured = cloudUrl
    ? /^https?:\/\//i.test(cloudUrl)
      ? cloudUrl
      : `https://${cloudUrl}`
    : process.env.NEXTAUTH_URL || process.env.PUBLIC_URL;

  if (!configured) return null;

  try {
    return `${new URL(configured).origin}/api/auth/google/callback`;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  let secret: string | undefined;
  clientId = process.env.GOOGLE_APP_ID;
  secret = process.env.GOOGLE_SECRET;
  if (!clientId) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: { in: ['google_id'] },
        },
      });
      const configMap = configs.reduce(
        (acc, config) => {
          acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
          return acc;
        },
        {} as Record<string, any>,
      );
      clientId = clientId || configMap.google_id;
    } catch (error) {
      console.error('Failed to fetch OAuth config from database:', error);
    }
  }
  if (!secret) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: { in: ['google_secret'] },
        },
      });
      const configMap = configs.reduce(
        (acc, config) => {
          acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
          return acc;
        },
        {} as Record<string, any>,
      );
      secret = secret || configMap.google_secret;
    } catch (error) {
      console.error('Failed to fetch OAuth config from database:', error);
    }
  }

  if (!clientId || !secret) {
    console.error('Missing Google OAuth configuration');
    return res.status(500).json({ error: 'OAuth configuration error' });
  }

  const redirectUri = getRedirectUri();
  if (!redirectUri) {
    console.error('Missing configured base URL for Google OAuth callback');
    return res.status(500).json({ error: 'OAuth configuration error' });
  }

  const state = await createOAuthState(
    req,
    res,
    'google',
    isLink ? (linkUserId ?? undefined) : undefined,
  );

  const scopes = ['email', 'openid', 'profile'];

  const oauth2 = new google.auth.OAuth2(clientId, secret, redirectUri);

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'online',
    scope: scopes,
    include_granted_scopes: true,
    state,
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  res.redirect(authUrl);
}
