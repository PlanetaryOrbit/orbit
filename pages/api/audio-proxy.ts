import { safeExternalUrl } from '@/utils/urlSafety';
import type { NextApiRequest, NextApiResponse } from 'next';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  'audio/mp4',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const rawUrl = req.query.url;
  const url = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  if (!url || typeof url !== 'string') return res.status(400).end();

  try {
    const target = await safeExternalUrl(url, ['audio-ssl.itunes.apple.com']);
    if (!target) return res.status(400).end();

    const upstream = await fetch(target.href, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return res.status(502).end();

    const contentType = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (contentType && !ALLOWED_CONTENT_TYPES.has(contentType)) return res.status(502).end();

    const declaredLength = Number(upstream.headers.get('content-length') ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
      return res.status(502).end();
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) return res.status(502).end();

    res.setHeader('Content-Type', contentType ?? 'audio/mp4');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(Buffer.from(buffer));
  } catch {
    return res.status(502).end();
  }
}
