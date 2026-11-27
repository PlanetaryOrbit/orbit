import cache from '@/utils/cache';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientIp(req: NextApiRequest): string {
  const trustedHeader = process.env.TRUST_PROXY_IP_HEADER;
  if (trustedHeader) {
    const value = req.headers[trustedHeader.toLowerCase()];
    if (typeof value === 'string' && value.trim()) {
      return value.split(',')[0].trim();
    }
  }

  return req.socket.remoteAddress || 'unknown';
}

export async function checkRateLimit(
  req: NextApiRequest,
  action: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const key = `ratelimit:${action}:${getClientIp(req)}`;
  const count = await cache.increment(key, Math.ceil(windowMs / 1000));

  return count <= max;
}

export function sendRateLimitExceeded(res: NextApiResponse): void {
  res.setHeader('Retry-After', '60');
  res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
}
