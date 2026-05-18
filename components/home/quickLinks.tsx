import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { IconChevronRight } from "@tabler/icons-react";
import { HomeEmpty, HomeSection } from "@/components/home/shell";

interface GroupLink {
  id: number;
  name: string;
  thumbnailUrl: string;
  rootPlace: { id: number; type: string };
}

export default function QuickLinks() {
  const [quickLinks, setQuickLinks] = useState<GroupLink[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady || !router.query.id) return;

    async function fetchQLs() {
      try {
        setLoading(true);
        const response = await axios.get(`/api/workspace/${router.query.id}/home/quickLinks`);
        setQuickLinks(response.data.experiences ?? []);
      } catch {
        setQuickLinks([]);
      } finally {
        setLoading(false);
      }
    }

    fetchQLs();
  }, [router.isReady, router.query.id]);

  const pushCreate = () => router.push("https://create.roblox.com");
  const pushGame = (id: number) => router.push(`https://www.roblox.com/games/${id}/`);

  return (
    <HomeSection title="Quick links">
      {loading ? (
        <div className="flex justify-center py-10">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-primary dark:border-zinc-600" />
        </div>
      ) : quickLinks.length === 0 ? (
        <HomeEmpty action={{ label: "Roblox Create", onClick: pushCreate }}>
          No experiences linked to this group yet.
        </HomeEmpty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickLinks.map((post) => (
            <button
              type="button"
              key={post.id}
              onClick={() => pushGame(post.rootPlace.id)}
              className="group relative aspect-[16/10] overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 text-left dark:border-zinc-700 dark:bg-zinc-800"
            >
              <img
                src={post.thumbnailUrl || "/favicon-32x32.png"}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5">
                <span className="line-clamp-2 text-xs font-medium leading-tight text-white">
                  {post.name}
                </span>
                <IconChevronRight className="h-4 w-4 shrink-0 text-white/80" stroke={2} />
              </div>
            </button>
          ))}
        </div>
      )}
    </HomeSection>
  );
}
