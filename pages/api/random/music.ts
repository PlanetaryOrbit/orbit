import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

type BillBoardResponse = {
  date: string;
  data: {
    song: string;
    artist: string;
  }[];
};

type Result = {
  song: string;
  artist: string;
  artwork: string;
  previewUrl: string;
  featuredLyric: string;
  lyrics: string[];
};

async function fetchLyrics(song: string, artist: string): Promise<string[]> {
  const response = await axios.get(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`
  );
  return (
    response.data.lyrics
      ?.split("\n")
      .filter((line: string) => line.trim() !== "") ?? []
  );
}

async function fetchItunesData(
  song: string,
  artist: string
): Promise<{ artwork: string; previewUrl: string }> {
  const response = await axios.get(
    `https://itunes.apple.com/search?term=${encodeURIComponent(`${song} ${artist}`)}&entity=song&limit=10`
  );
  const match =
    response.data.results?.find(
      (r: { artistName: string }) =>
        r.artistName.toLowerCase().includes(artist.toLowerCase())
    ) ?? response.data.results?.[0];

  return {
    artwork: match?.artworkUrl100 ?? "",
    previewUrl: match?.previewUrl ?? "",
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const topBillBoard = await axios.get<BillBoardResponse>(
      "https://raw.githubusercontent.com/mhollingshead/billboard-hot-100/main/recent.json"
    );
    const songs = topBillBoard.data.data;
    const randomSong = songs[Math.floor(Math.random() * songs.length)];

    const [lyrics, { artwork, previewUrl }] = await Promise.all([
      fetchLyrics(randomSong.song, randomSong.artist),
      fetchItunesData(randomSong.song, randomSong.artist),
    ]);

    const featuredLyric = lyrics.find((l) => l.length > 30 && l.length < 100) ?? lyrics[0] ?? "";

    const result: Result = {
      song: randomSong.song,
      artist: randomSong.artist,
      artwork,
      previewUrl,
      featuredLyric,
      lyrics,
    };

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch data" });
  }
}