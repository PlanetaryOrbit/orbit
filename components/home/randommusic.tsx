import { IconPlayerPlay, IconPlayerPause } from "@tabler/icons-react";
import { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { HomeSection } from "@/components/home/shell";

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
      .catch(() => {})
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
    <HomeSection title="Music">
      {data.previewUrl && (
        <audio
          ref={audioRef}
          src={`/api/audio-proxy?url=${encodeURIComponent(data.previewUrl)}`}
          preload="metadata"
        />
      )}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!data.previewUrl}
          className="relative shrink-0 disabled:cursor-default"
          aria-label={playing ? "Pause" : "Play preview"}
        >
          <img
            src={data.artwork}
            alt=""
            className="h-14 w-14 rounded-md object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
          />
          {data.previewUrl && (
            <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/35 opacity-0 transition-opacity hover:opacity-100">
              {playing ? (
                <IconPlayerPause className="h-5 w-5 text-white" stroke={2} />
              ) : (
                <IconPlayerPlay className="h-5 w-5 translate-x-px text-white" stroke={2} />
              )}
            </span>
          )}
        </button>
        <div className="min-w-0">
          <p className="text-sm leading-snug text-zinc-800 dark:text-zinc-200">
            &ldquo;{data.featuredLyric}&rdquo;
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {data.song} · {data.artist}
          </p>
        </div>
      </div>
    </HomeSection>
  );
}
