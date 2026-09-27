import { createHash, randomBytes } from 'node:crypto';

import { createId } from '@paralleldrive/cuid2';
import { Temporal } from 'temporal-polyfill';
import { db } from '~~/server/database/client';
import { syncRobloxData } from '~~/server/lib/roblox/sync';
import cache from '~~/server/utils/cache';
import type { ApiResponse, User } from '~~/shared/types';

type SignupRequest = {
  signupId: string;
};

type VerifyResponse = {
  user: User;
  isFirst: boolean;
};

type RobloxUser = {
  id: number;
  name: string;
  displayName: string;
  description?: string;
};

const sessionExpiration = 30 * 24 * 60 * 60 * 1000;

const ipRateLimit = 5;
const ipRateLimitWindow = 10 * 60;

const signupRateLimit = 3;
const signupRateLimitWindow = 10 * 60;

function error(statusCode: number, code: string, message: string) {
  return createError({
    statusCode,
    statusMessage: message,
    data: {
      code,
    },
  });
}

function createSessionToken(): string {
  return randomBytes(48).toString('hex');
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createExpiration(milliseconds: number): Temporal.PlainDateTime {
  const date = new Date(Date.now() + milliseconds);

  return Temporal.PlainDateTime.from({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
  });
}

function isExpired(value: Temporal.PlainDateTime): boolean {
  return Temporal.PlainDateTime.compare(value, Temporal.Now.plainDateTimeISO()) <= 0;
}

async function rateLimit(key: string, limit: number, window: number): Promise<void> {
  const cacheKey = `rate-limit:signup-verify:${key}`;
  const count = (await cache.get<number>(cacheKey)) ?? 0;

  if (count >= limit) {
    throw error(429, 'RATE_LIMITED', 'Too many verification attempts. Please try again later.');
  }

  await cache.set(cacheKey, count + 1, window);
}

async function getRobloxUser(id: string): Promise<RobloxUser> {
  let response: Response;

  try {
    response = await fetch(`https://users.roblox.com/v1/users/${id}`, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw error(502, 'ROBLOX_UNAVAILABLE', 'Unable to contact Roblox services.');
  }

  if (response.status === 429) {
    throw error(429, 'ROBLOX_RATE_LIMITED', 'Roblox is rate limiting requests.');
  }

  if (!response.ok) {
    throw error(502, 'ROBLOX_UNAVAILABLE', 'Unable to contact Roblox services.');
  }

  try {
    return (await response.json()) as RobloxUser;
  } catch {
    throw error(502, 'ROBLOX_UNAVAILABLE', 'Roblox returned an invalid response.');
  }
}

async function checkBioFallback(userId: string, verificationCode: string): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch(`https://www.roblox.com/users/${userId}/profile`, {
      headers: {
        'User-Agent': 'Orbit/3.0',
      },
    });
  } catch {
    return false;
  }

  if (!response.ok) {
    return false;
  }

  const html = await response.text();

  const metadata = [...html.matchAll(/<meta[^>]+content=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .join(' ');

  return metadata.includes(verificationCode);
}

async function verifyRobloxBio(
  userId: string,
  verificationCode: string,
  description?: string,
): Promise<boolean> {
  if (description?.includes(verificationCode)) {
    return true;
  }

  return checkBioFallback(userId, verificationCode);
}

export default defineEventHandler(async (event): Promise<ApiResponse<VerifyResponse>> => {
  const ip = getRequestIP(event, {
    xForwardedFor: true,
  });

  await rateLimit(`ip:${ip ?? 'unknown'}`, ipRateLimit, ipRateLimitWindow);

  const body = await readBody<SignupRequest>(event);

  if (typeof body?.signupId !== 'string' || !body.signupId) {
    throw error(400, 'INVALID_REQUEST', 'Signup ID is required.');
  }

  await rateLimit(`signup:${body.signupId}`, signupRateLimit, signupRateLimitWindow);

  const signup = await db.orm.public.SignupAttempt.where({
    id: body.signupId,
  }).first();

  if (!signup) {
    throw error(404, 'SIGNUP_NOT_FOUND', 'Signup attempt not found.');
  }

  if (isExpired(signup.expiresAt)) {
    await db.orm.public.SignupAttempt.where({
      id: signup.id,
    }).delete();

    throw error(410, 'SIGNUP_EXPIRED', 'Signup attempt expired.');
  }

  const robloxUser = await getRobloxUser(signup.robloxId);

  if (String(robloxUser.id) !== signup.robloxId) {
    throw error(
      400,
      'ROBLOX_ACCOUNT_CHANGED',
      'The Roblox account associated with this signup has changed.',
    );
  }

  const verified = await verifyRobloxBio(
    signup.robloxId,
    signup.verificationCode,
    robloxUser.description,
  );

  if (!verified) {
    throw error(400, 'VERIFICATION_FAILED', 'Verification code was not found in Roblox bio.');
  }

  const existingUser = await db.orm.public.User.where({
    username: signup.username,
  }).first();

  if (existingUser) {
    throw error(409, 'USERNAME_TAKEN', 'Username is already registered.');
  }

  const existingRobloxUser = await db.orm.public.User.where({
    robloxId: signup.robloxId,
  }).first();

  if (existingRobloxUser) {
    throw error(409, 'ACCOUNT_EXISTS', 'An account already exists for this Roblox account.');
  }

  const isFirst = !(await db.orm.public.User.first());
  const sessionToken = createSessionToken();

  const user = await db.orm.public.User.create({
    id: createId(),
    username: signup.username,
    robloxId: signup.robloxId,
    isOwner: isFirst,
  });

  await db.orm.public.Credential.create({
    id: createId(),
    userId: user.id,
    passwordHash: signup.passwordHash,
  });

  await db.orm.public.Session.create({
    id: createId(),
    tokenHash: hashSessionToken(sessionToken),
    userId: user.id,
    expiresAt: createExpiration(sessionExpiration),
  });

  await db.orm.public.SignupAttempt.where({
    id: signup.id,
  }).delete();

  setCookie(event, 'orbit_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  void syncRobloxData(user.id, signup.robloxId);

  return {
    success: true,
    data: {
      user,
      isFirst,
    },
  };
});
