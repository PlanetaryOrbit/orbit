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
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
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
  }
}