import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
// import { withAuth } from '@/lib/withSession';

export type TrackResult = {
  id: number;
  title: string;
  artist: string;
  artwork: string;
  previewUrl: string;
};

export default withAuth(async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!req.auth.userId) return res.status(401).json({ error: 'Not logged in' });

  const q = (req.query.q as string)?.trim();
  if (!q) return res.json({ results: [] });

  const response = await axios.get(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=8`
  );

  const results: TrackResult[] = (response.data.results ?? [])
    .filter((r: any) => r.previewUrl)
    .map((r: any) => ({
      id: r.trackId,
      title: r.trackName,
      artist: r.artistName,
      artwork: r.artworkUrl100,
      previewUrl: r.previewUrl,
    }));

  return res.json({ results });
});
