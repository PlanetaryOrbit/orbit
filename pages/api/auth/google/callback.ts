import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import { google } from 'googleapis';
import prisma from '@/utils/database';
import Package from '@/package.json';

type GoogleUserProfile = {
  id: string;
  displayName: string;
  photos?: { url: string }[];
  emailAddresses?: { value: string }[];
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

  let clientId: string | undefined = process.env.GOOGLE_APP_ID;
  let clientSecret: string | undefined = process.env.GOOGLE_SECRET;
  let emailFiltration: string | undefined = process.env.GOOGLE_EMAIL_FILTRATION;

  if (!clientId || !clientSecret) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: { key: { in: ['google_id', 'google_secret', 'google_email_filtration'] } },
      });

      const configMap = configs.reduce((acc, config) => {
        acc[config.key] =
          typeof config.value === 'string' ? config.value.trim() : config.value;
        return acc;
      }, {} as Record<string, any>);

      clientId = clientId || configMap.google_id;
      clientSecret = clientSecret || configMap.google_secret;
      emailFiltration = emailFiltration || configMap.google_email_filtration
    } catch (err) {
      console.error('Failed to fetch OAuth config from database:', err);
    }
  }

  if (!clientId || !clientSecret) {
    console.error('Missing Google OAuth configuration');
    return res.redirect('/login?error=config_error');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${baseUrl}/api/auth/google/callback`
  );

  try {
    // 1. Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    const { access_token } = tokens;

    if (!access_token) {
      throw new Error('No access token returned from Google');
    }

    oauth2Client.setCredentials(tokens);

    const peopleService = google.people({ version: 'v1', auth: oauth2Client });
    const profileResponse = await peopleService.people.get({
      resourceName: 'people/me',
      personFields: 'names,photos,emailAddresses',
    });

    const profile = profileResponse.data;
    const googleId = profile.resourceName?.replace('people/', '');

    if (!googleId) {
      throw new Error('Could not extract Google user ID');
    }

    const displayName = profile.names?.[0]?.displayName ?? 'Unknown';
    const avatar = profile.photos?.[0]?.url ?? null;
    const email = profile.emailAddresses?.[0]?.value ?? null;

    if (emailFiltration) {
      if (!email?.includes(emailFiltration)) {
        return res.redirect('/login?error=unauthorized-domain');
      }
    }

    const hasEntry = await prisma.googleUser.findUnique({
      where: { googleUserId: googleId },
    });

    if (!hasEntry && !req.session.userid) {
      return res.redirect('/login?error=google-not-linked');
    }

    req.session.googleid = googleId;
    delete req.session.oauthState;
    await req.session.save();

    const entry = await prisma.googleUser.upsert({
      where: { googleUserId: googleId },
      update: {
        username: displayName,
        avatar,
        email,
        ...(req.session.userid && { robloxUserId: BigInt(req.session.userid) }),
      },
      create: {
        googleUserId: googleId,
        username: displayName,
        avatar,
        email,
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

    return res.redirect('/login?error=google-not-linked');

  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return res.redirect('/?error=link-fail');
  }
}