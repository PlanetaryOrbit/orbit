import { createHash } from 'node:crypto';

import type { H3Event } from 'h3';
import { Temporal } from 'temporal-polyfill';
import { db } from '~~/server/database/client';
import type { User } from '~~/shared/types';

type SessionId = Parameters<typeof db.orm.public.Session.where>[0]['id'];

export type AuthUser = Pick<User, 'id' | 'username'>;

export async function authenticate(event: H3Event): Promise<AuthUser | null> {
  const sessionToken = getCookie(event, 'orbit_session');

  if (!sessionToken) {
    return null;
  }

  const tokenHash = createHash('sha256').update(sessionToken).digest('hex');

  const session = await db.orm.public.Session.where({ tokenHash }).first();

  if (!session) {
    return null;
  }

  if (Temporal.PlainDateTime.compare(session.expiresAt, Temporal.Now.plainDateTimeISO()) <= 0) {
    await db.orm.public.Session.where({ id: session.id }).delete();

    return null;
  }

  const user = await db.orm.public.User.where({
    id: session.userId as SessionId,
  }).first();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
  };
}
