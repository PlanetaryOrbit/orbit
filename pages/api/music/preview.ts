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

  const upstream = await axios.get(parsedUrl.toString(), {
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'audio/*,*/*',
    },
    timeout: 15000,
    maxRedirects: 0,
  });

  res.setHeader('Content-Type', upstream.headers['content-type'] || 'audio/mp4');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (upstream.headers['content-length']) {
    res.setHeader('Content-Length', upstream.headers['content-length']);
  }
  if (upstream.headers['accept-ranges']) {
    res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);
  }

  upstream.data.pipe(res);
});
