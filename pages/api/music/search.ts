<<<<<<< HEAD
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
=======
import type { NextApiRequest, NextApiResponse } from "next";

const ITUNES_ENDPOINT = "https://itunes.apple.com/search";

type TrackResult = {
  id: string;
  name: string;
  artist: string;
  album: string;
  artwork: string;
  preview: string;
  link: string;
  duration: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = req.query.q;

  if (typeof query !== "string" || !query.trim()) {
>>>>>>> refs/remotes/origin/main
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
<<<<<<< HEAD
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
=======
    const params = new URLSearchParams({
      term: query,
      entity: "song",
      limit: "10",
    });

    const requestUrl = `${ITUNES_ENDPOINT}?${params.toString()}`;

    const apiResponse = await fetch(requestUrl);

    if (!apiResponse.ok) {
      throw new Error(`Upstream iTunes request failed (${apiResponse.status})`);
    }

    const payload = await apiResponse.json();

    const tracks: TrackResult[] = (payload.results || []).map((item: any) => {
      return {
        id: String(item.trackId),
        name: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        artwork: item.artworkUrl100,
        preview: item.previewUrl,
        link: item.trackViewUrl,
        duration: item.trackTimeMillis,
      };
    });

    return res.status(200).json({ tracks });
  } catch (err) {
    console.error("Music search failed:", err);
    return res.status(500).json({ error: "Failed to search iTunes" });
>>>>>>> refs/remotes/origin/main
  }
}