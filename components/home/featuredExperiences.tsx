import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { IconPlayerPlay } from "@tabler/icons-react";

interface GroupLink {
  id: number;
  name: string;
  thumbnailUrl: string;
  rootPlace: { id: number; type: string };
}

export default function FeaturedExperiences() {
  const [links, setLinks] = useState<GroupLink[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady || !router.query.id) return;
    setLoading(true);
    axios
      .get(`/api/workspace/${router.query.id}/home/quickLinks`)
      .then((res) => setLinks(res.data.experiences ?? []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, [router.isReady, router.query.id]);

  if (loading) {
    return (
      <div className="flex h-36 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900/60">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-primary dark:border-zinc-600" />
      </div>
    );
  }

  if (links.length === 0) return null;

  const open = (id: number) => router.push(`https://www.roblox.com/games/${id}/`);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {links.slice(0, 4).map((game) => (
        <button
          key={game.id}
          type="button"
          onClick={() => open(game.rootPlace.id)}
          className="group relative h-36 overflow-hidden rounded-2xl text-left sm:h-40"
        >
          <img
            src={game.thumbnailUrl || "/favicon-32x32.png"}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-zinc-950/10" />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <p className="text-base font-semibold text-white drop-shadow-sm">{game.name}</p>
            <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-white/25">
              <IconPlayerPlay className="h-3.5 w-3.5" fill="currentColor" />
              Play
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
