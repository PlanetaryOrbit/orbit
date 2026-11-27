import crypto from 'crypto';

import type { NextApiRequest, NextApiResponse } from 'next';

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getAllowedOrigins(): string[] {
  const cloudUrl = process.env.PLANETARY_CLOUD_URL;
  const configured = [
    process.env.NEXTAUTH_URL,
    process.env.PUBLIC_URL,
    ...(process.env.ALLOWED_ORIGINS?.split(',') ?? []),
  ];

  if (cloudUrl) {
    configured.push(/^https?:\/\//i.test(cloudUrl) ? cloudUrl : `https://${cloudUrl}`);
  }

  const origins = configured
    .map(normalizeOrigin)
    .filter((origin): origin is string => origin !== null);

  return Array.from(new Set(origins));
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.replace(/^::ffff:/i, '');
  return normalized === '::1' || normalized === '127.0.0.1';
}

function isDevelopmentOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

export function validateOrigin(req: NextApiRequest): boolean {
  const allowedOrigins = getAllowedOrigins();

  const originHeader = req.headers.origin;
  if (originHeader !== undefined) {
    if (typeof originHeader !== 'string') return false;
    const origin = normalizeOrigin(originHeader);
    if (!origin) return false;
    if (allowedOrigins.includes(origin)) return true;
    return process.env.NODE_ENV === 'development' && isDevelopmentOrigin(origin);
  }

  const refererHeader = req.headers.referer;
  if (refererHeader !== undefined) {
    if (typeof refererHeader !== 'string') return false;
    const origin = normalizeOrigin(refererHeader);
    if (!origin) return false;
    if (allowedOrigins.includes(origin)) return true;
    return process.env.NODE_ENV === 'development' && isDevelopmentOrigin(origin);
  }

  return process.env.NODE_ENV === 'development' && isLoopbackAddress(req.socket.remoteAddress);
}

export function validateCsrf(req: NextApiRequest, res: NextApiResponse): boolean {
  const method = req.method?.toUpperCase();
  if (!method || ['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  if (!validateOrigin(req)) {
    console.error('[CSRF] Origin/Referer validation failed', {
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
    });
    return false;
  }

  return true;
}

export function generateCsrfToken(sessionId: string | number): string {
  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  if (!secret) {
    throw new Error('SESSION_SECRET or SECRET_KEY must be configured for CSRF token generation');
  }

  const timestamp = Date.now();
  const data = `${sessionId}:${timestamp}`;

  const token = crypto.createHmac('sha256', secret).update(data).digest('hex');

  return `${token}:${timestamp}`;
}

export function validateCsrfToken(
  token: string,
  sessionId: string | number,
  maxAge: number = 60 * 60 * 1000,
): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [tokenHash, timestampStr] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return false;
  }

  const now = Date.now();
  if (now - timestamp > maxAge) {
    return false;
  }

  const secret = process.env.SESSION_SECRET || process.env.SECRET_KEY;
  if (!secret) {
    return false;
  }

  const data = `${sessionId}:${timestamp}`;
  const expectedToken = crypto.createHmac('sha256', secret).update(data).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(expectedToken));
}
