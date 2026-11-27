import * as crypto from 'crypto';

import prisma from '@/utils/database';

export const VERIFICATION_TTL_MS = 15 * 60 * 1000;

const CODE_EMOJI = [
  '📋',
  '🎉',
  '🎂',
  '📆',
  '✔️',
  '📃',
  '👍',
  '➕',
  '📢',
  '🐒',
  '🐴',
  '🐑',
  '🐘',
  '🐼',
  '🐧',
  '🐦',
  '🐤',
  '🐥',
  '🐣',
  '🐔',
  '🐍',
  '🐢',
  '🐛',
  '🐝',
  '🐜',
  '🎱',
  '🏉',
  '🎳',
  '⛳',
  '🚵',
  '🚴',
  '🏁',
  '🏇',
];

/** Cryptographically random, same shape as the existing emoji codes. */
export function generateVerificationCode(): string {
  const code = Array.from(
    { length: 11 },
    () => CODE_EMOJI[crypto.randomInt(0, CODE_EMOJI.length)],
  ).join('');

  return `🤖${code}`;
}

export function isVerificationExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > VERIFICATION_TTL_MS;
}

export async function findLatestResetState(userId: bigint) {
  const records = await prisma.verificationState.findMany({
    where: { userId, isReset: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  const record = records[0];
  if (!record || isVerificationExpired(record.createdAt)) return null;

  return record;
}
