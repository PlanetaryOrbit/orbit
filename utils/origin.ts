import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * The single public origin an instance is served from. This is operator-controlled:
 * never derive it from Host or forwarded-host headers.
 */
export function getCanonicalOrigin(): string | null {
  const candidates = [
    process.env.PLANETARY_CLOUD_URL,
    process.env.NEXTAUTH_URL,
    process.env.PUBLIC_URL,
    ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
  ];

  for (const raw of candidates) {
    if (!raw?.trim()) continue;

    const value = raw.trim();
    const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.origin;
    } catch {
      // Ignore malformed configuration and try the next candidate.
    }
  }

  return null;
}

/**
 * OAuth state cookies are host-only. Start flows must therefore begin on the
 * same host that handles the callback, otherwise the one-time cookie is lost.
 */
export function redirectToCanonicalOrigin(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
): boolean {
  const origin = getCanonicalOrigin();
  if (!origin) return false;

  const incomingHost = req.headers.host?.toLowerCase();
  if (!incomingHost) return false;

  try {
    if (new URL(origin).host.toLowerCase() === incomingHost) return false;
  } catch {
    return false;
  }

  const query = req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(302, `${origin}${path}${query}`);
  return true;
}
