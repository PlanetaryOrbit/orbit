import fs from 'fs';
import fsPromises from 'fs/promises';

import type { NextApiRequest, NextApiResponse } from 'next';

import { getMedia, getMediaPathForFile } from '@/utils/media';
import { getCachedMedia, setCachedMedia } from '@/utils/mediaCache';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  if (!id) {
    return res.status(400).end();
  }
  if (req.method === 'GET') {
    return serveMedia(id, req, res);
  }

  res.setHeader('Allow', 'GET');

  return res.status(405).end();
}

async function serveMedia(id: string, req: NextApiRequest, res: NextApiResponse) {
  let media = await getCachedMedia(id);
  if (!media) {
    const databaseMedia = await getMedia(id);

    if (!databaseMedia) {
      return res.status(404).end();
    }

    media = databaseMedia;

    await setCachedMedia(id, media);
  }

  let filePath: string;

  try {
    filePath = getMediaPathForFile(media.filename);
  } catch {
    return res.status(404).end();
  }

  try {
    const stat = await fsPromises.stat(filePath);

    if (!stat.isFile()) {
      return res.status(404).end();
    }

    const etag = `"${media.sha256}"`;

    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', `inline; filename="${media.filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; img-src 'self'; style-src 'none'; script-src 'none'; frame-src 'none'",
    );
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', (error) => {
      console.error('[MEDIA] Stream failed:', error);

      if (!res.headersSent) {
        res.status(404).end();
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  } catch {
    return res.status(404).end();
  }
}
