import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { withSessionRoute } from '@/lib/withSession';

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!req.session.userid) return res.status(401).end();

  const url = req.query.url as string;
  if (!url) {
    return res.status(400).end('Invalid URL');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).end('Invalid URL');
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.hostname !== 'audio-ssl.itunes.apple.com' ||
    parsedUrl.username ||
    parsedUrl.password ||
    (parsedUrl.port !== '' && parsedUrl.port !== '443')
  ) {
    return res.status(400).end('Invalid URL');
  }

  try {
    const upstream = await axios.get(parsedUrl.toString(), {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'audio/*,*/*',
      },
      timeout: 15000,
      maxRedirects: 0,
    });

    const contentType = upstream.headers['content-type'];
    const contentLength = upstream.headers['content-length'];
    const acceptRanges = upstream.headers['accept-ranges'];

    res.setHeader('Content-Type', typeof contentType === 'string' ? contentType : 'audio/mp4');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (typeof contentLength === 'string') {
      res.setHeader('Content-Length', contentLength);
    }
    if (typeof acceptRanges === 'string') {
      res.setHeader('Accept-Ranges', acceptRanges);
    }

    upstream.data.on('error', () => {
      if (!res.headersSent) res.status(502).end();
    });

    upstream.data.pipe(res);
  } catch {
    if (!res.headersSent) res.status(502).end();
  }
});