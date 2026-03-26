import { IconMusic, IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";
import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";

type SongData = {
  song: string;
  artist: string;
  artwork: string;
  previewUrl: string;
  featuredLyric: string;
  lyrics: string[];
};

export default function RandomMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [data, setData] = useState<SongData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/random/music")
      .then((r) => {
        if (r.status === 200) setData(r.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data) return;
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setPlaying(false);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [data]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      await audio.play();
      setPlaying(true);
    }
  }, [playing]);

  if (loading || !data) return null;

  return (
    <div className="z-0 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl shadow-sm p-4 flex flex-col gap-4 mb-6 relative overflow-hidden">
      {data.previewUrl && (
        <audio
          ref={audioRef}
          src={`/api/audio-proxy?url=${encodeURIComponent(data.previewUrl)}`}
          preload="metadata"
        />
      )}

      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <IconMusic className="w-5 h-5 text-primary" />
        </div>
        <span className="text-lg font-medium text-zinc-900 dark:text-white">Music Quote</span>
      </div>

      <div className="flex items-center gap-5">
        <button
          onClick={togglePlay}
          disabled={!data.previewUrl}
          className="relative flex-shrink-0 group focus:outline-none disabled:cursor-default"
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          <img
            src={data.artwork}
            alt={data.song}
            className="w-16 h-16 rounded-full object-cover border-2 border-white ring-2 ring-transparent group-hover:ring-primary transition"
          />
          {data.previewUrl && (
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {playing
                ? <IconPlayerPause className="w-5 h-5 text-white" />
                : <IconPlayerPlay className="w-5 h-5 text-white ml-0.5" />}
            </div>
          )}
        </button>

        <div className="min-w-0 flex flex-col gap-0.5">
          <p className="text-zinc-900 dark:text-white font-medium leading-snug text-sm italic">
            "{data.featuredLyric}"
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
            {data.song} - {data.artist}
          </p>
        </div>
      </div>
    </div>
  );
}