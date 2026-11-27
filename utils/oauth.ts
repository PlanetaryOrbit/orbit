import * as crypto from 'crypto';

import { safeEqual } from '@/lib/security';
import prisma from '@/utils/database';
import * as cookie from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';

const COOKIE_PREFIX = 'oauth_state_';
const STATE_TTL_SECONDS = 10 * 60;

function signingSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET must be configured for OAuth state');
  return secret;
}

function sign(state: string): string {
  return crypto.createHmac('sha256', signingSecret()).update(state).digest('hex');
}

function cookieValue(state: string): string {
  return `${state}.${sign(state)}`;
}

function stateFromCookie(req: NextApiRequest, provider: string): string | null {
  const cookies = cookie.parse(req.headers.cookie || '');
  const raw = cookies[`${COOKIE_PREFIX}${provider}`];
  if (!raw) return null;

  const [state, signature] = raw.split('.');
  if (!state || !signature || !safeEqual(signature, sign(state))) return null;

  return state;
}

function clearStateCookie(res: NextApiResponse, provider: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_PREFIX}${provider}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
}

/** Creates a one-time state bound to the browser via a signed cookie. */
export async function createOAuthState(
  req: NextApiRequest,
  res: NextApiResponse,
  provider: string,
  userId?: bigint,
): Promise<string> {
  const state = crypto.randomBytes(32).toString('hex');

  await prisma.oAuthState.create({
    data: {
      state,
      provider,
      userId,
      expiresAt: new Date(Date.now() + STATE_TTL_SECONDS * 1000),
    },
  });

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_PREFIX}${provider}=${cookieValue(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${STATE_TTL_SECONDS}${secure}`,
  );

  return state;
}

export async function consumeOAuthState(
  req: NextApiRequest,
  res: NextApiResponse,
  state: string,
  provider: string,
): Promise<Awaited<ReturnType<typeof prisma.oAuthState.findUnique>>> {
  clearStateCookie(res, provider);

  const cookieState = stateFromCookie(req, provider);
  if (!cookieState || !safeEqual(cookieState, state)) return null;

  const record = await prisma.oAuthState.findUnique({ where: { state } });
  if (!record || record.provider !== provider || record.expiresAt < new Date()) return null;

  await prisma.oAuthState.delete({ where: { state } });
  return record;
}
