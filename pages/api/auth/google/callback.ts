import type { AuthenticatedRequest } from '@/lib/withAuth';
import { invalidateUserProfileCache } from '@/utils/accountCache';
import { setSessionCookie } from '@/utils/authCookies';
import prisma from '@/utils/database';
import { consumeOAuthState } from '@/utils/oauth';
import { getCanonicalOrigin } from '@/utils/origin';
import { createSession, getSessionByToken } from '@/utils/session';
import cookie from 'cookie';
import { google } from 'googleapis';
import type { NextApiResponse } from 'next';

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/login?error=oauth_error');
  }

  if (!code || !state || typeof state !== 'string') {
    return res.redirect('/login?error=missing_params');
  }

  // Validate and consume the state before exchanging the authorization code.
  const oauthState = await consumeOAuthState(req, res, state, 'google');
  if (!oauthState) {
    return res.redirect('/login?error=invalid_state');
  }

  const isLink = oauthState.userId !== null;
  const accountError = (code: string) =>
    `/settings?tab=connections&error=${encodeURIComponent(code)}`;

  const baseUrl = getCanonicalOrigin();
  if (!baseUrl) {
    return res.redirect(isLink ? accountError('config_error') : '/login?error=config_error');
  }

  let clientId = process.env.GOOGLE_APP_ID;
  let clientSecret = process.env.GOOGLE_SECRET;
  let emailFiltration = process.env.GOOGLE_EMAIL_FILTRATION;

  if (!clientId || !clientSecret) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: {
            in: ['google_id', 'google_secret', 'google_email_filtration'],
          },
        },
      });

      const configMap = configs.reduce(
        (acc, config) => {
          acc[config.key] = typeof config.value === 'string' ? config.value.trim() : config.value;

          return acc;
        },
        {} as Record<string, any>,
      );

      clientId ||= configMap.google_id;
      clientSecret ||= configMap.google_secret;
      emailFiltration ||= configMap.google_email_filtration;
    } catch (err) {
      console.error('Failed to fetch OAuth config:', err);
    }
  }

  if (!clientId || !clientSecret) {
    return res.redirect(isLink ? accountError('config_error') : '/login?error=config_error');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${baseUrl}/api/auth/google/callback`,
  );

  const sessionToken = cookie.parse(req.headers.cookie || '').session_token;
  const activeSession = sessionToken ? await getSessionByToken(sessionToken) : null;

  if (isLink && (!activeSession || activeSession.userId !== oauthState.userId)) {
    return res.redirect(accountError('session_mismatch'));
  }

  try {
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens.access_token) {
      throw new Error('No access token returned');
    }

    oauth2Client.setCredentials(tokens);

    const peopleService = google.people({
      version: 'v1',
      auth: oauth2Client,
    });

    const profileResponse = await peopleService.people.get({
      resourceName: 'people/me',
      personFields: 'names,photos,emailAddresses',
    });

    const profile = profileResponse.data;

    const googleId = profile.resourceName?.replace('people/', '');

    if (!googleId) {
      throw new Error('Could not extract Google ID');
    }

    const displayName = profile.names?.[0]?.displayName ?? 'Unknown';

    const avatar = profile.photos?.[0]?.url ?? null;

    const email = profile.emailAddresses?.[0]?.value ?? null;

    if (emailFiltration) {
      if (!email?.includes(emailFiltration)) {
        return res.redirect(
          isLink ? accountError('unauthorized-domain') : '/login?error=unauthorized-domain',
        );
      }
    }

    const existingGoogle = await prisma.googleUser.findUnique({
      where: {
        googleUserId: googleId,
      },
    });

    if (isLink) {
      const userId = oauthState.userId!;

      if (existingGoogle?.robloxUserId && existingGoogle.robloxUserId !== userId) {
        return res.redirect(accountError('already_linked'));
      }

      await prisma.googleUser.upsert({
        where: {
          googleUserId: googleId,
        },
        update: {
          username: displayName,
          avatar,
          email,
          robloxUserId: userId,
        },
        create: {
          googleUserId: googleId,
          username: displayName,
          avatar,
          email,
          robloxUserId: userId,
        },
      });

      await invalidateUserProfileCache(userId);

      return res.redirect('/settings?tab=connections&linked=google');
    }

    if (activeSession) {
      return res.redirect('/');
    }

    if (!existingGoogle?.robloxUserId) {
      return res.redirect('/login?error=google-not-linked');
    }

    const ipAddress = (req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress) as string;

    const session = await createSession(
      existingGoogle.robloxUserId,
      ipAddress,
      req.headers['user-agent'],
    );

    setSessionCookie(res, session.token);

    return res.redirect('/');
  } catch (err) {
    console.error('Google OAuth callback error:', err);

    return res.redirect(isLink ? accountError('oauth_failed') : '/?error=link-fail');
  }
}
