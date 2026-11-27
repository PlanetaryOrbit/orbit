import { readLimitedBody, safeExternalUrl } from '@/utils/urlSafety';
import type { NextApiRequest, NextApiResponse } from 'next';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const DEFAULT_CONTENT_TYPE = 'image/jpeg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const rawUrl = req.query.url;
  const url = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  if (!url || typeof url !== 'string') return res.status(400).end();

  try {
    const target = await safeExternalUrl(url, ['lh3.googleusercontent.com']);
    if (!target) return res.status(400).end();

    const canonicalTarget = new URL(target.pathname + target.search, 'https://lh3.googleusercontent.com');

    const upstream = await fetch(canonicalTarget, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return res.status(502).end();

    const contentType =
      upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ??
      DEFAULT_CONTENT_TYPE;
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return res.status(502).end();

    const declaredLength = Number(upstream.headers.get('content-length') ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
      return res.status(502).end();
    }

    const buffer = await readLimitedBody(upstream, MAX_BYTES);
    if (!buffer) return res.status(502).end();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch {
    return res.status(502).end();
  }
}
