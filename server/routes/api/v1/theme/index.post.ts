import { defineEventHandler, readBody, setCookie } from 'h3';

import type { ApiResponse } from '~/server/utils/types';

type Theme = 'dark' | 'light';

export default defineEventHandler(async (event): Promise<ApiResponse<{ theme: Theme }>> => {
  const body = await readBody<{ theme?: Theme }>(event);

  if (body?.theme !== 'dark' && body?.theme !== 'light') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid theme',
    });
  }

  setCookie(event, 'theme', body.theme, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  });

  return {
    success: true,
    data: {
      theme: body.theme,
    },
  };
});
