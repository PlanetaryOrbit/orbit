import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== 'string') return res.status(400).end();

  if (!url.startsWith('https://lh3.googleusercontent.com/')) {
    return res.status(403).end();
  }

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    res.setHeader('Content-Type', String(response.headers['content-type'] || 'image/jpeg'));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(response.data));
  } catch {
    res.status(502).end();
  }
}