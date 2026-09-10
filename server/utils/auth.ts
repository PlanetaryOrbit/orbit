import { createHash } from 'node:crypto';

import type { H3Event } from 'h3';
import type { FieldOutputTypes } from '~~/prisma/contract.d';
import { db } from '~~/server/database/client';

type User = FieldOutputTypes['public']['User'];

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

  if (session.expiresAt <= Temporal.Now.plainDateTimeISO()) {
    await db.orm.public.Session.where({ id: session.id }).delete();

    return null;
  }

  const user = await db.orm.public.User.where({ id: session.id }).first();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
  };
}
