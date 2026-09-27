import { randomInt } from 'node:crypto';

import { createId } from '@paralleldrive/cuid2';
import { Temporal } from 'temporal-polyfill';
import { db } from '~~/server/database/client';
import { getSettings } from '~~/server/lib/instance';
import fetchAvatar from '~~/server/utils/avatar';
import cache from '~~/server/utils/cache';
import { encrypt } from '~~/server/utils/password';
import type { ApiResponse } from '~~/shared/types';

type SignupRequest = {
  username: string;
  password: string;
};

type SignupResponse = {
  signupId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  verification: {
    type: 'roblox_bio';
    code: string;
    expiresAt: string;
  };
};

type RobloxUser = {
  id: number;
  name: string;
  displayName: string;
};

type RobloxUsersResponse = {
  data?: RobloxUser[];
};

const verificationCharacters = [
  '🐱',
  '🐈',
  '🐾',
  '😺',
  '😸',
  '😹',
  '😻',
  '😼',
  '😽',
  '🙀',
  '😿',
  '😾',
  '🌸',
  '⭐',
  '🌙',
  '☀️',
  '🍀',
  '🌈',
  '💙',
];

const verificationExpiration = 30 * 60 * 1000;
const robloxCacheTtl = 5 * 60;
const signupCacheTtl = 5 * 60;

const ipRateLimit = 25;
const ipRateLimitWindow = 10 * 60;

const accountRateLimit = 2;
const accountRateLimitWindow = 10 * 60;

function error(statusCode: number, code: string, message: string) {
  return createError({
    statusCode,
    statusMessage: message,
    data: { code },
  });
}

function generateVerificationCode(): string {
  return Array.from(
    { length: 12 },
    () => verificationCharacters[randomInt(verificationCharacters.length)],
  ).join('');
}

function createExpiration(): Temporal.PlainDateTime {
  const date = new Date(Date.now() + verificationExpiration);

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

async function rateLimit(key: string, limit: number, ttl: number) {
  const cacheKey = `rate-limit:signup:${key}`;
  const count = (await cache.get<number>(cacheKey)) ?? 0;

  if (count >= limit) {
    throw error(429, 'RATE_LIMITED', 'Too many signup attempts. Please try again later.');
  }

  await cache.set(cacheKey, count + 1, ttl);
}

async function getRobloxUser(username: string): Promise<RobloxUser | null> {
  const cacheKey = `signup:roblox:${username.toLowerCase()}`;
  const cached = await cache.get<RobloxUser>(cacheKey);

  if (cached) {
    return cached;
  }

  let response: Response;

  try {
    response = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false,
      }),
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

  const body = (await response.json()) as RobloxUsersResponse;
  const user = body.data?.[0] ?? null;

  if (user) {
    await cache.set(cacheKey, user, robloxCacheTtl);
  }

  return user;
}

async function getSignup(robloxId: string): Promise<SignupResponse | null> {
  const cacheKey = `signup:attempt:${robloxId}`;
  const cached = await cache.get<SignupResponse>(cacheKey);

  if (cached) {
    return cached;
  }

  const attempt = await db.orm.public.SignupAttempt.where({
    robloxId,
  }).first();

  if (!attempt) {
    return null;
  }

  const response: SignupResponse = {
    signupId: attempt.id,
    user: {
      id: robloxId,
      username: attempt.username,
      displayName: attempt.username,
      avatar: null,
    },
    verification: {
      type: 'roblox_bio',
      code: attempt.verificationCode,
      expiresAt: attempt.expiresAt.toString(),
    },
  };

  await cache.set(cacheKey, response, signupCacheTtl);

  return response;
}

export default defineEventHandler(async (event): Promise<ApiResponse<SignupResponse>> => {
  const settings = await getSettings();

  if (!settings.enableRegistration) {
    throw error(403, 'REGISTRATION_DISABLED', 'Registration is disabled.');
  }

  if (!settings.allowPasswordAuth) {
    throw error(403, 'PASSWORD_AUTH_DISABLED', 'Password authentication is disabled.');
  }

  const ip = getRequestIP(event, {
    xForwardedFor: true,
  });

  await rateLimit(`ip:${ip ?? 'unknown'}`, ipRateLimit, ipRateLimitWindow);

  const body = await readBody<SignupRequest>(event);

  if (typeof body?.username !== 'string' || typeof body?.password !== 'string') {
    throw error(400, 'INVALID_REQUEST', 'Username and password are required.');
  }

  const username = body.username.trim();
  const password = body.password;

  if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    throw error(400, 'INVALID_USERNAME', 'Invalid Roblox username.');
  }

  if (password.length < 8) {
    throw error(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters.');
  }

  const robloxUser = await getRobloxUser(username);

  if (!robloxUser) {
    throw error(404, 'ROBLOX_USER_NOT_FOUND', 'Roblox user not found.');
  }

  const robloxId = String(robloxUser.id);

  await rateLimit(`account:${robloxId}`, accountRateLimit, accountRateLimitWindow);

  const existingUser = await db.orm.public.User.where({
    robloxId,
  }).first();

  if (existingUser) {
    throw error(409, 'ACCOUNT_EXISTS', 'An account already exists for this Roblox account.');
  }

  const existingSignup = await getSignup(robloxId);

  if (existingSignup) {
    existingSignup.user.username = robloxUser.name;
    existingSignup.user.displayName = robloxUser.displayName;

    return {
      success: true,
      data: existingSignup,
    };
  }

  const verificationCode = generateVerificationCode();
  const expiresAt = createExpiration();

  const [passwordHash, avatar] = await Promise.all([encrypt(password), fetchAvatar(robloxUser.id)]);

  const signup = await db.orm.public.SignupAttempt.create({
    id: createId(),
    username: robloxUser.name,
    passwordHash,
    robloxId,
    verificationCode,
    expiresAt,
  });

  const response: SignupResponse = {
    signupId: signup.id,
    user: {
      id: robloxId,
      username: robloxUser.name,
      displayName: robloxUser.displayName,
      avatar,
    },
    verification: {
      type: 'roblox_bio',
      code: verificationCode,
      expiresAt: expiresAt.toString(),
    },
  };

  await cache.set(`signup:attempt:${robloxId}`, response, signupCacheTtl);

  return {
    success: true,
    data: response,
  };
});
