import type { AuthenticatedRequest } from '@/lib/withAuth';
import Package from '@/package.json';
import { invalidateUserProfileCache } from '@/utils/accountCache';
import { setSessionCookie } from '@/utils/authCookies';
import prisma from '@/utils/database';
import { consumeOAuthState } from '@/utils/oauth';
import { createSession, getSessionByToken } from '@/utils/session';
import axios from 'axios';
import * as cookie from 'cookie';
import type { NextApiResponse } from 'next';

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

type DiscordUserResponse = {
  id: string;
  username: string;
  avatar: string;
};

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/login?error=oauth_error');
  }

  if (!code || !state || typeof state !== 'string') {
    return res.redirect('/login?error=missing_params');
  }

  const oauthState = await consumeOAuthState(req, res, state, 'discord');
  if (!oauthState) {
    return res.redirect('/login?error=invalid_state');
  }

  const isLink = oauthState.userId !== null;
  const accountError = (code: string) =>
    `/settings?tab=connections&error=${encodeURIComponent(code)}`;

  if (isLink) {
    const sessionToken = cookie.parse(req.headers.cookie || '').session_token;
    const activeSession = sessionToken ? await getSessionByToken(sessionToken) : null;

    if (!activeSession || activeSession.userId !== oauthState.userId) {
      return res.redirect(accountError('session_mismatch'));
    }
  }

  let clientId = process.env.DISCORD_APPLICATION_ID;
  let clientSecret = process.env.DISCORD_SECRET;

  if (!clientId || !clientSecret) {
    const configs = await prisma.instanceConfig.findMany({
      where: {
        key: {
          in: ['discordAppID', 'discordAppSecret'],
        },
      },
    });

    const map = configs.reduce(
      (acc, c) => {
        acc[c.key] = typeof c.value === 'string' ? c.value.trim() : c.value;
        return acc;
      },
      {} as Record<string, any>,
    );

    clientId ||= map.discordAppID;
    clientSecret ||= map.discordAppSecret;
  }

  if (!clientId || !clientSecret) {
    return res.redirect(isLink ? accountError('config_error') : '/login?error=config_error');
  }

  try {
    const tokenResponse = await axios.post<DiscordTokenResponse>(
      'https://discord.com/api/v10/oauth2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${process.env.PLANETARY_CLOUD_URL ? `https://${process.env.PLANETARY_CLOUD_URL}` : process.env.NEXTAUTH_URL || process.env.PUBLIC_URL}/api/auth/discord/callback`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `orbit/${Package.version}`,
        },
      },
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get<DiscordUserResponse>(
      'https://discord.com/api/v10/users/@me',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': `orbit/${Package.version}`,
        },
      },
    );

    const discordUser = userResponse.data;
    const discordUserId = BigInt(discordUser.id);

    const existingDiscord = await prisma.discordUser.findUnique({
      where: { discordUserId },
    });

    if (isLink) {
      const userId = oauthState.userId!;

      if (existingDiscord?.robloxUserId && existingDiscord.robloxUserId !== userId) {
        return res.redirect(accountError('already_linked'));
      }

      await prisma.discordUser.upsert({
        where: { discordUserId },
        update: {
          username: discordUser.username,
          avatar: discordUser.avatar,
          robloxUserId: userId,
        },
        create: {
          discordUserId,
          username: discordUser.username,
          avatar: discordUser.avatar,
          robloxUserId: userId,
        },
      });

      await invalidateUserProfileCache(userId);

      return res.redirect('/settings?tab=connections&linked=discord');
    }

    const sessionToken = cookie.parse(req.headers.cookie || '').session_token;
    if (sessionToken && (await getSessionByToken(sessionToken))) {
      return res.redirect('/');
    }

    if (!existingDiscord?.robloxUserId) {
      return res.redirect('/login?error=not_linked');
    }

    const ipAddress =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    const session = await createSession(
      existingDiscord.robloxUserId,
      ipAddress,
      req.headers['user-agent'],
    );

    setSessionCookie(res, session.token, 60 * 60 * 24 * 7);

    return res.redirect('/');
  } catch (err) {
    console.error('Discord OAuth error:', err);

    if (axios.isAxiosError(err)) {
      console.error(err.response?.data);
    }

    return res.redirect(isLink ? accountError('oauth_failed') : '/login?error=oauth_failed');
  }
}
