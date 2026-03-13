import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const term = encodeURIComponent(q);
    const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=10`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`iTunes API returned ${response.status}`);
    }

    const data = await response.json();
    const tracks = data.results.map((track: any) => ({
      id: String(track.trackId),
      name: track.trackName,
      artist: track.artistName,
      album: track.collectionName,
      artwork: track.artworkUrl100,
      preview: track.previewUrl,
      link: track.trackViewUrl,
      duration: track.trackTimeMillis,
    }));

    return res.status(200).json({ tracks });
  } catch (error) {
    console.error('iTunes search error:', error);
    return res.status(500).json({ error: 'Failed to search iTunes' });
  }
}