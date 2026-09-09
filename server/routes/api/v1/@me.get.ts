import { db } from '~~/server/database/client';
import { authenticate } from '~~/server/utils/auth';
import type { ApiResponse, User } from '~~/server/utils/types';

export default defineEventHandler(async (event): Promise<ApiResponse<User>> => {
  const auth = await authenticate(event);

  if (!auth) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const user = await db.orm.public.User.where({ id: auth.id }).first();

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found',
    });
  }

  return {
    success: true,
    data: user,
  };
});
