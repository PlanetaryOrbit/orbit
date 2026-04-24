import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';
import { google } from 'googleapis';

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const originUrl = req.headers.host;
	const isLocalhost = originUrl?.includes('localhost');

  let clientId: string | undefined;
  let secret: string | undefined
  clientId = process.env.GOOGLE_APP_ID;
  secret = process.env.GOOGLE_SECRET;
  if (!clientId) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: { in: ['google_id'] }
        }
      });
      const configMap = configs.reduce((acc, config) => {
        acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
        return acc;
      }, {} as Record<string, any>);
      clientId = clientId || configMap.google_id;
    } catch (error) {
      console.error('Failed to fetch OAuth config from database:', error);
    }
  }
  if (!secret) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: { in: ['google_secret'] }
        }
      });
      const configMap = configs.reduce((acc, config) => {
        acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;
        return acc;
      }, {} as Record<string, any>);
      secret = secret || configMap.google_secret;
    } catch (error) {
      console.error('Failed to fetch OAuth config from database:', error);
    }
  }

  if (!clientId || !secret) {
    console.error('Missing Google OAuth configuration');
    return res.status(500).json({ error: 'OAuth configuration error' });
  };

  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  req.session.oauthState = state;
  await req.session.save();

  const scopes = ['email','openid','profile'];

  const oauth2 = new google.auth.OAuth2(clientId, secret, `${ isLocalhost ? "http://" : "https://" }${originUrl}/api/auth/google/callback`);

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'online',
    scope: scopes,
    include_granted_scopes: true,
    state: state,
    client_id: clientId,
    redirect_uri: `${ isLocalhost ? "http://" : "https://" }${originUrl}/api/auth/google/callback`
  });

  res.redirect(authUrl)

}