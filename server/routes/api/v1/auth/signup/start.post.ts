import { randomInt } from 'node:crypto';

import { createId } from '@paralleldrive/cuid2';
import { Temporal } from 'temporal-polyfill';
import { db } from '~~/server/database/client';
import { getSettings } from '~~/server/lib/instance';
import fetchAvatar from '~~/server/utils/avatar';
import cache from '~~/server/utils/cache';
import { encrypt } from '~~/server/utils/password';
import type { ApiResponse, ErrorBody, SignupResponse } from '~~/shared/types';

type SignupRequest = {
  username: string;
  password: string;
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
  '🐈‍⬛',
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
  '😹',
  '😻',
  '🐶',
  '🐕',
  '🐩',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐭',
  '🐹',
  '🐰',
  '🦝',
  '🦄',
  '🐸',
  '🐵',
  '🙈',
  '🙉',
  '🙊',
  '🐔',
  '🐧',
  '🐦',
  '🐤',
  '🐣',
  '🦆',
  '🦉',
  '🦋',
  '🐌',
  '🐞',
  '🐝',
  '🐛',
  '🪲',
  '🐢',
  '🐍',
  '🦎',
  '🐙',
  '🦑',
  '🦀',
  '🐠',
  '🐟',
  '🐡',
  '🐬',
  '🐳',
  '🐋',
  '🌸',
  '🌺',
  '🌻',
  '🌹',
  '🌷',
  '🌼',
  '💐',
  '🪻',
  '🌱',
  '🌿',
  '☘️',
  '🍀',
  '🍃',
  '🍂',
  '🍁',
  '🌴',
  '🌳',
  '🌲',
  '🌵',
  '🌾',
  '🌙',
  '☀️',
  '🌞',
  '🌝',
  '⭐',
  '🌟',
  '✨',
  '💫',
  '🌈',
  '☁️',
  '🌤️',
  '🌥️',
  '🌦️',
  '🌧️',
  '⛈️',
  '🌩️',
  '❄️',
  '☃️',
  '⛄',
  '🌊',
  '💧',
  '🔥',
  '🍎',
  '🍏',
  '🍐',
  '🍊',
  '🍋',
  '🍌',
  '🍉',
  '🍇',
  '🍓',
  '🫐',
  '🍒',
  '🍑',
  '🍍',
  '🥝',
  '🍅',
  '🥕',
  '🌽',
  '🥑',
  '🍄',
  '🍞',
  '🥐',
  '🥨',
  '🧀',
  '🍕',
  '🍔',
  '🍟',
  '🌭',
  '🍿',
  '🍩',
  '🍪',
  '🍰',
  '🧁',
  '🍫',
  '🍬',
  '🍭',
  '🍨',
  '🍦',
  '🍮',
  '🧋',
  '☕',
  '🍵',
  '❤️',
  '🧡',
  '💛',
  '💚',
  '💙',
  '💜',
  '🩷',
  '🩵',
  '🤍',
  '🖤',
  '🤎',
  '🩶',
  '💖',
  '💗',
  '💓',
  '💞',
  '💕',
  '💘',
  '💝',
  '💟',
  '❣️',
  '💌',
  '💎',
  '🔮',
  '🎀',
  '🎁',
  '🎈',
  '🎉',
  '🎊',
  '🪄',
  '🔔',
  '⭐',
  '🌟',
  '✨',
  '💫',
  '☀️',
  '☁️',
  '☂️',
  '⚡',
  '❄️',
];

const verificationExpiration = 30 * 60 * 1000;
const robloxCacheTtl = 5 * 60;
const signupCacheTtl = 5 * 60;

const ipRateLimit = 25;
const ipRateLimitWindow = 10 * 60;

const accountRateLimit = 2;
const accountRateLimitWindow = 10 * 60;

function error(statusCode: number, body: ErrorBody): never {
  throw createError({
    statusCode,
    statusMessage: body.message,
    data: body,
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
    error(429, {
      code: 'RATE_LIMITED',
      message: 'Too many signup attempts. Please try again later.',
    });
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
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false,
      }),
    });
  } catch {
    error(502, {
      code: 'ROBLOX_UNAVAILABLE',
      message: 'Unable to contact Roblox services.',
    });
  }

  if (response.status === 429) {
    error(429, {
      code: 'ROBLOX_RATE_LIMITED',
      message: 'Roblox is rate limiting requests.',
    });
  }

  if (!response.ok) {
    error(502, {
      code: 'ROBLOX_UNAVAILABLE',
      message: 'Unable to contact Roblox services.',
    });
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

  const avatar = await fetchAvatar(robloxId).catch(() => null);

  const response: SignupResponse = {
    signupId: attempt.id,
    user: {
      id: robloxId,
      username: attempt.username,
      displayName: attempt.username,
      avatar,
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
    error(403, {
      code: 'REGISTRATION_DISABLED',
      message: 'Registration is disabled.',
    });
  }

  if (!settings.allowPasswordAuth) {
    error(403, {
      code: 'PASSWORD_AUTH_DISABLED',
      message: 'Password authentication is disabled.',
    });
  }

  const ip = getRequestIP(event, {
    xForwardedFor: true,
  });

  await rateLimit(`ip:${ip ?? 'unknown'}`, ipRateLimit, ipRateLimitWindow);

  const body = await readBody<SignupRequest>(event);

  if (typeof body?.username !== 'string' || typeof body?.password !== 'string') {
    error(400, {
      code: 'INVALID_REQUEST',
      message: 'Username and password are required.',
    });
  }

  const username = body.username.trim();
  const password = body.password;

  if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    error(400, {
      code: 'INVALID_USERNAME',
      message: 'Invalid Roblox username.',
    });
  }

  if (password.length < 8) {
    error(400, {
      code: 'WEAK_PASSWORD',
      message: 'Password must be at least 8 characters.',
    });
  }

  const robloxUser = await getRobloxUser(username);

  if (!robloxUser) {
    error(404, {
      code: 'ROBLOX_USER_NOT_FOUND',
      message: 'Roblox user not found.',
    });
  }

  const robloxId = String(robloxUser.id);

  await rateLimit(`account:${robloxId}`, accountRateLimit, accountRateLimitWindow);

  const [existingUser, existingSignup] = await Promise.all([
    db.orm.public.User.where({
      robloxId,
    }).first(),
    getSignup(robloxId),
  ]);

  if (existingUser) {
    error(409, {
      code: 'ACCOUNT_EXISTS',
      message: 'An account already exists for this Roblox account.',
    });
  }

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

  const [passwordHash, avatar] = await Promise.all([encrypt(password), fetchAvatar(robloxId)]);

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
