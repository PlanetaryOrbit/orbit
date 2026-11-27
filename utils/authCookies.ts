import type { NextApiResponse } from 'next';

export const SESSION_COOKIE = 'session_token';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function secureFlag(): string {
  return process.env.NODE_ENV === 'production' ? '; Secure' : '';
}

export function setSessionCookie(
  res: NextApiResponse,
  token: string,
  maxAge = SESSION_MAX_AGE,
): void {
  res.appendHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureFlag()}`,
  );
}

export function clearSessionCookie(res: NextApiResponse): void {
  res.appendHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`,
  );
}
